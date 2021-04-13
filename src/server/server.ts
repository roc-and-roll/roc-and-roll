import { logEntryMessageAdd } from "../shared/actions";
import { setupReduxStore } from "./setupReduxStore";
import { setupStateSync } from "./setupStateSync";
import { setupWebServer } from "./setupWebServer";
import os from "os";
import path from "path";
import fs from "fs";

// TODO: Place uploaded files somewhere else where it is safe.
const uploadedFilesDir = path.join(
  os.tmpdir(),
  "roc-and-roll",
  "uploaded-files"
);
fs.mkdirSync(uploadedFilesDir, { recursive: true });

const { io, url } = setupWebServer(uploadedFilesDir);

const store = setupReduxStore();

setupStateSync(io, store);

console.log(`Roc & Roll started at ${url}.`);
console.log(`Files are stored in ${uploadedFilesDir}.`);

// Demo: Create a new log message every second
setInterval(() => {
  store.dispatch(
    logEntryMessageAdd({
      playerId: "foo",
      silent: false,
      payload: {
        text: "Test log message",
      },
    })
  );
}, 1000);
