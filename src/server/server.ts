import { logEntryMessageAdd } from "../shared/actions";
import { setupReduxStore } from "./setupReduxStore";
import { setupStateSync } from "./setupStateSync";
import { setupWebServer } from "./setupWebServer";
import os from "os";
import path from "path";
import fs from "fs";
import { setupStatePersistence } from "./setupStatePersistence";
import { SyncedState } from "../shared/state";

// TODO: Place uploaded files somewhere else where it is safe.
const workspaceDir = path.join(os.tmpdir(), "roc-and-roll");
fs.mkdirSync(workspaceDir, { recursive: true });

const uploadedFilesDir = path.join(workspaceDir, "uploaded-files");
fs.mkdirSync(uploadedFilesDir, { recursive: true });

const statePath = path.join(workspaceDir, "state.json");

const { io, url } = setupWebServer(uploadedFilesDir);

let initialState: SyncedState | undefined = undefined;
if (fs.existsSync(statePath)) {
  initialState = JSON.parse(fs.readFileSync(statePath, { encoding: "utf-8" }));
}
const store = setupReduxStore(initialState);

setupStateSync(io, store);

setupStatePersistence(store, statePath);

console.log(`Roc & Roll started at ${url}.`);
console.log(`Files are stored in ${workspaceDir}.`);

// Demo: Create a new log message every second
false &&
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
