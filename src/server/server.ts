import { setupReduxStore } from "./setupReduxStore";
import { setupStateSync } from "./setupStateSync";
import { setupWebServer } from "./setupWebServer";
import path from "path";
import fs from "fs";
import { setupStatePersistence } from "./setupStatePersistence";
import { entries, SyncedState } from "../shared/state";
import { ephermalPlayerUpdate } from "../shared/actions";
import { setupArgs } from "./setupArgs";
import { EMPTY_ENTITY_COLLECTION } from "../shared/state";
import { isSyncedState } from "../shared/validation";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

void (async () => {
  const { workspace: workspaceDir, quiet, port: httpPort } = setupArgs();
  fs.mkdirSync(workspaceDir, { recursive: true });

  const uploadedFilesDir = path.join(workspaceDir, "uploaded-files");
  fs.mkdirSync(uploadedFilesDir, { recursive: true });

  const uploadedFilesCacheDir = path.join(uploadedFilesDir, "cache");
  fs.mkdirSync(uploadedFilesCacheDir, { recursive: true });

  const statePath = path.join(workspaceDir, "state.json");

  const { io, url } = await setupWebServer(
    httpPort,
    uploadedFilesDir,
    uploadedFilesCacheDir
  );

  let initialState: SyncedState | undefined = undefined;
  if (fs.existsSync(statePath)) {
    const dirtyState = JSON.parse(
      fs.readFileSync(statePath, { encoding: "utf-8" })
    ) as unknown;
    const errors: string[] = [];
    if (!isSyncedState(dirtyState, { errors })) {
      errors.forEach((error) => console.error(error));
      console.error(`
#############################################
#############################################

Your state is invalid. This can lead to bugs.

Do you want to...

a) quit the server
b) continue anyway
c) delete the old state

#############################################
#############################################`);
      const answer = await new Promise<string>((resolve) =>
        rl.question("Your answer: ", (answer) => {
          rl.close();
          resolve(answer);
        })
      );

      switch (answer) {
        default:
        case "a":
          process.exit(1);
          break;
        case "b":
          initialState = dirtyState as SyncedState;
          break;
        case "c":
          initialState = undefined;
          break;
      }
    } else {
      initialState = dirtyState;
    }

    if (initialState !== undefined) {
      // Reset ephermal state
      initialState.ephermal = {
        players: EMPTY_ENTITY_COLLECTION,
        activeSongs: EMPTY_ENTITY_COLLECTION,
      };
    }
  }
  const store = setupReduxStore(initialState);

  if (process.env.NODE_ENV === "development") {
    store.subscribe(() => {
      const errors: string[] = [];
      if (!isSyncedState(store.getState(), { errors })) {
        errors.forEach((error) => console.error(error));
        console.error(`
#############################################
#############################################

Your state is invalid. This can lead to bugs.

This should not have happened!

#############################################
#############################################`);
      }
    });
  }

  setupStateSync(io, store, quiet);

  setupStatePersistence(store, statePath);

  // Delete mouse position if it has not changed for some time.
  const DELETE_MOUSE_POSITION_TIME_THRESHOLD = 60 * 1000;
  setInterval(() => {
    const now = Date.now();
    const state = store.getState();
    entries(state.ephermal.players)
      .filter(
        (each) =>
          each.mapMouse &&
          now - each.mapMouse.lastUpdate > DELETE_MOUSE_POSITION_TIME_THRESHOLD
      )
      .forEach((each) => {
        store.dispatch(
          ephermalPlayerUpdate({ id: each.id, changes: { mapMouse: null } })
        );
      });
  }, 2000);

  console.log(`Roc & Roll started at ${url}.`);
  console.log(`Files are stored in ${workspaceDir}.`);
})();
