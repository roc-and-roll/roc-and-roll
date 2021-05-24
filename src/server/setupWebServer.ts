import path from "path";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
// These two packages speed up socket.io. Include them here just to verify that
// they are installed.
import "bufferutil";
import "utf-8-validate";
import multer from "multer";
import { nanoid } from "@reduxjs/toolkit";
import { RRFile } from "../shared/state";
import sharp from "sharp";
import { fittingTokenSize } from "../shared/util";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { randomColor } from "../shared/colors";
import fetch from "node-fetch";
import AsyncLock from "async-lock";
import { GRID_SIZE, SOCKET_IO_PATH } from "../shared/constants";

export async function setupWebServer(
  httpPort: number,
  uploadedFilesDir: string,
  uploadedFilesCacheDir: string
) {
  const url = `http://localhost:${httpPort}`;

  // First, create a new Express JS app that we use to serve our website.
  const app = express();

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
        const data: RRFile[] = req.files.map((file) => ({
          originalFilename: file.originalname,
          filename: file.filename,
        }));
        res.json(data);
      } catch (err) {
        next(err);
      }
    }
  );

  let cachedTabletopaudioResponse: any;
  app.get("/api/tabletopaudio", async (req, res, next) => {
    try {
      if (cachedTabletopaudioResponse) {
        res.json(cachedTabletopaudioResponse);
        return;
      }

      const result = await fetch("https://tabletopaudio.com/tta_data");
      res.json((cachedTabletopaudioResponse = await result.json()));
    } catch (err) {
      next(err);
    }
  });

  // (3) Serve uploaded files
  app.use("/files", express.static(uploadedFilesDir));

  const lock = new AsyncLock();

  // (4) Add an endpoint to generate tokens from already uploaded files
  app.get<{ filename: string; size: string; zoom: string }>(
    "/api/token-image/:filename/:size",
    async (req, res, next) => {
      try {
        const filename = req.params.filename;
        const requestedSize = parseInt(req.params.size);
        if (
          !/^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)?$/.test(filename) ||
          isNaN(requestedSize)
        ) {
          res.status(400);
          console.error("Invalid request", { filename, size: requestedSize });
          return;
        }

        // Only allow to generate one token size per token in parallel.
        await lock.acquire(filename, async () => {
          const size = fittingTokenSize(requestedSize);

          const inputPath = path.join(uploadedFilesDir, filename);
          const outputPath = path.join(
            uploadedFilesCacheDir,
            `${size}-${filename}.png`
          );

          if (!existsSync(outputPath)) {
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
                  r="${RADIUS - BORDER_WIDTH / 2 - 0.5}"
                  fill="transparent"
                  stroke-width="${BORDER_WIDTH}"
                  stroke="#502d16" />
                <circle
                  cx="${CENTER}"
                  cy="${CENTER}"
                  r="${RADIUS - BORDER_WIDTH / 2}"
                  fill="transparent"
                  stroke-width="${BORDER_WIDTH}"
                  stroke="#b39671" />
              </svg>`,
                "utf-8"
              )
            ).toBuffer();

            console.log("Generating token", filename, size);
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
            console.log("Finished token", filename, size);
          }

          const file = await readFile(outputPath);
          res.writeHead(200, {
            "Content-Type": "image/png",
            "Content-Length": file.length,
          });
          res.end(file);
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // (5) Add end endpoint that generates a random image suitable for a token
  const tmp = require.context("../third-party/game-icons.net", true, /\.svg$/);
  const icons = tmp
    .keys()
    .map((key) => tmp.resolve(key))
    .map((id) => (__webpack_require__ as (str: string) => string)(id))
    .map((each) => path.join(__dirname, each));

  app.post("/api/random-token", async (req, res, next) => {
    try {
      const icon = icons[Math.floor(Math.random() * icons.length)];
      if (!icon) {
        throw new Error();
      }

      const filename = `generated-${nanoid()}.svg`;
      const background = randomColor();

      await sharp(await sharp(icon).resize(450, 450).toBuffer())
        .extend({ top: 50, left: 50, right: 50, bottom: 50, background })
        .flatten({ background })
        .png()
        .toFile(path.join(uploadedFilesDir, filename));

      const file: RRFile = {
        filename,
        originalFilename: filename,
      };
      return res.json(file);
    } catch (err) {
      next(err);
    }
  });

  // (6) Serve the client code to the browser
  if (process.env.NODE_ENV === "development") {
    // In development, simply redirect all non-api requests to the webpack dev
    // server, which serves the client code on its own.
    app.get("*", (req, res, next) => {
      if (req.url.startsWith("/api")) {
        return next();
      }
      res.redirect(`${req.protocol}://${req.hostname}:3001${req.originalUrl}`);
    });
  } else {
    // 1. In production, serve the client code and static assets.
    app.use(express.static(path.resolve(__dirname, "client")));
    app.use(express.static(path.resolve(__dirname, "public")));
    // 2. If no asset with that name exists, serve the client code again.
    //    This makes it easy to support routing in the frontend (later).
    app.get("*", (req, res, next) =>
      res.sendFile(path.resolve(__dirname, "client", "index.html"))
    );
  }

  // Spin up the Express JS instance.
  const http = app.listen(httpPort, "0.0.0.0");

  // (7) Now also spin up a websocket server.
  // In development, we need to allow CORS access not only from the url of the
  // server, but also from the webpack dev server port.
  const io = new SocketIOServer(http, {
    path: SOCKET_IO_PATH,
    cors: {
      origin: process.env.NODE_ENV !== "development" ? url : "*",
    },
  });

  process.once("SIGUSR2", function () {
    http.close(function () {
      process.kill(process.pid, "SIGUSR2");
    });
  });

  return { io, url };
}
