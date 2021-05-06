import { setupReduxStore } from "./setupReduxStore";
import { setupStateSync } from "./setupStateSync";
import { setupWebServer } from "./setupWebServer";
import path from "path";
import fs from "fs";
import { setupStatePersistence } from "./setupStatePersistence";
import { entries, SyncedState } from "../shared/state";
import { ephermalPlayerUpdate } from "../shared/actions";
import { setupArgs } from "./setupArgs";

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
    initialState = JSON.parse(
      fs.readFileSync(statePath, { encoding: "utf-8" })
    ) as SyncedState;
    // Reset ephermal state
    initialState.ephermal = {
      players: {
        ids: [],
        entities: {},
      },
    };
  }
  const store = setupReduxStore(initialState);

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
