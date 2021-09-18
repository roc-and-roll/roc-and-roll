import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
// These two packages speed up socket.io. Include them here just to verify that
// they are installed.
import "bufferutil";
import "utf-8-validate";
import multer from "multer";
import { nanoid } from "@reduxjs/toolkit";
import { RRFile, RRFileImage } from "../shared/state";
import sharp from "sharp";
import { fittingTokenSize } from "../shared/util";
import { existsSync } from "fs";
import { randomColor } from "../shared/colors";
import AsyncLock from "async-lock";
import { GRID_SIZE, SOCKET_IO_PATH } from "../shared/constants";
import compression from "compression";
import {
  calculateBlurhash,
  getAudioDuration,
  getImageDimensions,
  getMimeType,
  isMimeTypeAudio,
  isMimeTypeImage,
} from "./files";
import { isAllowedFiletypes } from "../shared/files";
import serverTiming from "server-timing";
import { randomBetweenInclusive } from "../shared/random";

const ONE_YEAR = 1000 * 60 * 60 * 24 * 365;

export async function setupWebServer(
  httpHost: string,
  httpPort: number,
  uploadedFilesDir: string,
  uploadedFilesCacheDir: string
) {
  const url = `http://${httpHost}:${httpPort}`;

  // First, create a new Express JS app that we use to serve our website.
  const app = express();
  app.set("etag", true);
  app.use(compression());
  app.use(
    serverTiming({
      enabled: process.env.NODE_ENV !== "production",
    })
  );

  if (process.env.NODE_ENV === "development") {
    // (1) In development, add a CORS header so that the client is allowed to
    // communicate with the server. This is necessary, because client and
    // server run on different ports in development.
    app.use((req, res, next) => {
      res.setHeader("Access-Control-Allow-Origin", `*`);
      next();
    });
  }

  // (2) Add an endpoint to upload files
  const storage = multer.diskStorage({
    destination: uploadedFilesDir,
    filename: (req, file, cb) =>
      cb(null, `${nanoid()}${path.extname(file.originalname)}`),
  });

  app.post(
    "/api/upload",
    multer({ storage }).array("files"),
    async (req, res, next) => {
      try {
        if (!Array.isArray(req.files)) {
          res.status(400);
          return;
        }

        const allowedFileTypes = req.body.allowedFileTypes;
        if (!isAllowedFiletypes(allowedFileTypes)) {
          res.status(400);
          return;
        }

        const data: RRFile[] = await Promise.all(
          req.files.map(async (file) => {
            const mimeType = await getMimeType(file.path);
            if (mimeType === undefined) {
              throw new Error(
                "MimeType could not be determined for uploaded file."
              );
            }

            const isImage = isMimeTypeImage(mimeType);
            const isAudio = isMimeTypeAudio(mimeType);

            if (
              (allowedFileTypes === "image" && !isImage) ||
              (allowedFileTypes === "audio" && !isAudio)
            ) {
              throw new Error(
                `A file with mime type ${mimeType} cannot be uploaded as ${allowedFileTypes}.`
              );
            }

            return {
              originalFilename: file.originalname,
              filename: file.filename,
              mimeType,
              ...(isImage
                ? {
                    type: "image" as const,
                    ...(await getImageDimensions(file.path)),
                    blurhash: await calculateBlurhash(file.path),
                  }
                : isAudio
                ? {
                    type: "audio" as const,
                    duration: await getAudioDuration(file.path),
                  }
                : { type: "other" as const }),
            };
          })
        );
        res.json(data);
      } catch (err) {
        next(err);
      }
    }
  );

  // (3) Serve uploaded files
  app.use(
    "/api/files",
    express.static(uploadedFilesDir, {
      etag: true,
      immutable: true,
      maxAge: ONE_YEAR,
    })
  );

  const lock = new AsyncLock();

  // (4) Add an endpoint to generate tokens from already uploaded files
  app.get<{ filename: string; size: string; zoom: string }>(
    "/api/token-image/:filename/:size",
    async (req, res, next) => {
      try {
        const filename = req.params.filename;
        const requestedSize = parseInt(req.params.size);
        const borderColor = req.query["borderColor"];
        if (
          !/^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)?$/.test(filename) ||
          isNaN(requestedSize) ||
          typeof borderColor !== "string" ||
          !/^#[0-9a-f]{6}$/i.test(borderColor)
        ) {
          res.status(400);
          console.error("Invalid request", {
            filename,
            size: requestedSize,
            borderColor,
          });
          return;
        }

        res.startTime("lock", "Awaiting lock");

        // Only allow to generate one token size per token in parallel.
        await lock.acquire(filename, async () => {
          res.endTime("lock");
          const size = fittingTokenSize(requestedSize);

          const inputPath = path.join(uploadedFilesDir, filename);
          const outputPath = path.join(
            uploadedFilesCacheDir,
            `${size}-${filename}-${borderColor}.png`
          );

          if (!existsSync(outputPath)) {
            console.log("Generating token", { filename, size, borderColor });
            res.startTime("generate", "Generating token");

            const CENTER = size / 2;
            const RADIUS = size / 2 - 1;
            const BORDER_WIDTH = 3 * (size / GRID_SIZE);
            const mask = await sharp(
              Buffer.from(
                `<svg viewBox="0 0 ${size} ${size}">
                   <circle cx="${CENTER}" cy="${CENTER}" r="${RADIUS}" fill="#000" />
                 </svg>`,
                "utf-8"
              )
            ).toBuffer();
            const border = await sharp(
              Buffer.from(
                `<svg viewBox="0 0 ${size} ${size}">
                   <circle
                     cx="${CENTER}"
                     cy="${CENTER}"
                     r="${RADIUS - BORDER_WIDTH / 2}"
                     fill="transparent"
                     stroke-width="${BORDER_WIDTH}"
                     stroke="${borderColor}" />
                 </svg>`,
                "utf-8"
              )
            ).toBuffer();

            await sharp(inputPath)
              .resize({
                width: size,
                height: size,
                fit: "cover",
                position: "top",
              })
              .composite([
                { input: mask, blend: "dest-in" },
                { input: border, blend: "over" },
              ])
              .png()
              .toFile(outputPath);
            console.log("Finished token", { filename, size, borderColor });
            res.endTime("generate");
          }

          res.sendFile(outputPath);
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // (5) Add end endpoint that generates a random image suitable for a token
  const ctx = require.context("../third-party/game-icons.net", true, /\.svg$/);
  const icons = ctx
    .keys()
    .map((moduleId) => ctx(moduleId))
    .map((path: string) => fileURLToPath(path));

  app.post("/api/random-token", async (req, res, next) => {
    try {
      const icon = icons[randomBetweenInclusive(0, icons.length - 1)];
      if (!icon) {
        throw new Error();
      }

      const filename = `generated-${nanoid()}.svg`;
      const background = randomColor();
      const outputPath = path.join(uploadedFilesDir, filename);

      res.startTime("generate", "Generating token");
      await sharp(await sharp(icon).resize(450, 450).toBuffer())
        .extend({ top: 50, left: 50, right: 50, bottom: 50, background })
        .flatten({ background })
        .png()
        .toFile(outputPath);
      res.endTime("generate");

      const file: RRFileImage = {
        filename,
        originalFilename: filename,
        mimeType: "image/png",
        type: "image",
        width: 550,
        height: 550,
        blurhash: await (async () => {
          res.startTime("blurhash", "Calculating blurhash");
          const blurhash = await calculateBlurhash(outputPath);
          res.endTime("blurhash");
          return blurhash;
        })(),
      };
      return res.json(file);
    } catch (err) {
      next(err);
    }
  });

  // (6) Serve the client code to the browser
  if (process.env.NODE_ENV !== "production") {
    // In development, simply redirect all non-api requests to the webpack dev
    // server, which serves the client code on its own.
    app.get("*", (req, res, next) => {
      if (req.url.startsWith("/api")) {
        return next();
      }

      res.redirect(
        `${req.protocol}://${
          process.env["CODESPACES"]
            ? req.header("x-forwarded-host")!.replace("3000", "3001")
            : `${req.hostname}:3001`
        }${req.originalUrl}`
      );
    });
  } else {
    // We cannot use `import.meta.url` here, because webpack replaces that at build
    // time. Thus, we use a global that does not exist which we sed replace in the
    // generated js files after webpack is done. Our fake global must have the same
    // length as the `import.meta.url` so that source maps continue to work.
    //
    // Additional files:
    // - src/shared/types/index.d.ts
    // - import-meta-url-hack.sh
    //
    const __filename = fileURLToPath(IMPORT_META_URL);
    const __dirname = path.dirname(__filename);

    // 1. In production, serve the client code and static assets.

    // Serve the index.html file explicitly, instead of reyling on the express.static
    // call below. This is necessary because it is the only file in the client folder
    // that does not include a content hash in its filename. We therefore must not
    // serve it with the maxAge and immutable headers configured in the express.static
    // call below.
    app.get("/", (req, res, next) =>
      res.sendFile(path.resolve(__dirname, "client", "index.html"))
    );
    // Serve font files without immutable and maxAge set to true, since they do
    // not include hashes in their filenames.
    app.get(
      "/fonts/*",
      express.static(path.resolve(__dirname, "client"), {
        etag: true,
      })
    );

    app.use(
      express.static(path.resolve(__dirname, "client"), {
        etag: true,
        immutable: true,
        maxAge: ONE_YEAR,
      })
    );
    app.use(express.static(path.resolve(__dirname, "public"), { etag: true }));

    // 2. If no asset with that name exists, serve the client code again.
    //    This makes it easy to support routing in the frontend (later).
    app.get("*", (req, res, next) =>
      res.sendFile(path.resolve(__dirname, "client", "index.html"))
    );
  }

  // Spin up the Express JS instance.
  const http = app.listen(httpPort, httpHost);

  // (7) Now also spin up a websocket server.
  // In development, we need to allow CORS access since the client code is
  // running on a different port.
  const io = new SocketIOServer(http, {
    path: SOCKET_IO_PATH,
    cors: {
      origin: process.env.NODE_ENV === "development" ? "*" : undefined,
    },
  });

  process.once("SIGUSR2", function () {
    http.close(function () {
      process.kill(process.pid, "SIGUSR2");
    });
  });

  return { io, url };
}
