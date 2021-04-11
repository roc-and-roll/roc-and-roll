import path from "path";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
// These two packages speed up socket.io. Include them here just to verify that
// they are installed.
import "bufferutil";
import "utf-8-validate";

export function setupWebServer() {
  const httpPort = 3000;
  const url = `http://localhost:${httpPort}`;

  // First, create a new Express JS app that we use to serve our website.
  const app = express();

  if (process.env.NODE_ENV === "development") {
    // In development, add a CORS header so that the client is allowed to
    // communicate with the server. This is necessary, because client and
    // server run on different ports in development.
    app.use((req, res, next) => {
      // 1. Handle the request
      next();
      // 2. Set the CORS header
      if (!res.headersSent) {
        // Only set header if the headers have not already been sent.
        // This happens, e.g., when calling res.redirect()
        res.setHeader(
          "Access-Control-Allow-Origin",
          `${req.protocol}://${req.hostname}:3001`
        );
      }
    });
  }

  // Serve the client code to the browser
  if (process.env.NODE_ENV === "development") {
    // In development, simply redirect all requests (except websockets) to the
    // webpack dev server, which serves the client code on its own.
    app.get("*", (req, res, next) => {
      // If we add non-websocket routes later, these might need to be excluded
      // here.
      //
      // if (
      //   req.url.startsWith("/images") ||
      //   req.url === "/reset" ||
      //   req.url === "/verify"
      // ) {
      //   // Because the image registry can only be registered after loading the
      //   // workspace, we need to make sure this catch-all route ignores /images.
      //   return next();
      // }
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
  const http = app.listen(httpPort);

  // Now also spin up a websocket server.
  // In development, we need to allow CORS access not only from the url of the
  // server, but also from the webpack dev server port.
  const io = new SocketIOServer(http, {
    cors: {
      origin:
        process.env.NODE_ENV !== "development"
          ? url
          : [url, "http://localhost:3001"],
    },
  });

  process.once("SIGUSR2", function () {
    http.close(function () {
      process.kill(process.pid, "SIGUSR2");
    });
  });

  return { io, url };
}
