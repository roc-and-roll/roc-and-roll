import path from "path";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
// These packages speed-up socket.io. Include them here just to verify that they
// arae installed.
import "bufferutil";
import "utf-8-validate";
// Example
import { Foo } from "../shared/shared";
// import { setupStateSync } from "./setupStateSync.ts_";
import { setupReduxStore } from "./setupReduxStore";
import { setupStateSync } from "./setupStateSync";

new Foo();

const httpPort = 3000;
const url = `http://localhost:${httpPort}`;

// Setup webserver
const app = express();
if (process.env.NODE_ENV === "development") {
  // Allow access from the webpack dev server in development
  app.use((req, res, next) => {
    next();
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

if (process.env.NODE_ENV === "development") {
  // Redirect to the webpack dev server
  app.get("*", (req, res, next) => {
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
  app.use(express.static(path.resolve(__dirname, "client")));
  app.use(express.static(path.resolve(__dirname, "public")));
  app.get("*", (req, res, next) =>
    res.sendFile(path.resolve(__dirname, "client", "index.html"))
  );
}

const http = app.listen(httpPort);
console.log(`Roc & Roll started at ${url}.`);

// Setup websocket server
const io = new SocketIOServer(http, {
  cors: {
    origin:
      process.env.NODE_ENV !== "development"
        ? url
        : [url, "http://localhost:3001"],
  },
});

const store = setupReduxStore();
setupStateSync(io, store);

setInterval(() => {
  store.dispatch({ type: "diceRolls/rollDice", payload: 20 });
}, 1000);
