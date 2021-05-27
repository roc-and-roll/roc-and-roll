import { setupReduxStore } from "./setupReduxStore";
import { setupStateSync } from "./setupStateSync";
import { setupWebServer } from "./setupWebServer";
import path from "path";
import fs from "fs";
import { setupStatePersistence } from "./setupStatePersistence";
import { entries } from "../shared/state";
import { ephermalPlayerUpdate } from "../shared/actions";
import { setupArgs } from "./setupArgs";
import { isSyncedState } from "../shared/validation";
import { setupInitialState } from "./setupInitialState";

void (async () => {
  const { workspace: workspaceDir, quiet, port: httpPort } = setupArgs();
  fs.mkdirSync(workspaceDir, { recursive: true });

  const uploadedFilesDir = path.join(workspaceDir, "uploaded-files");
  fs.mkdirSync(uploadedFilesDir, { recursive: true });

  const uploadedFilesCacheDir = path.join(uploadedFilesDir, "cache");
  fs.mkdirSync(uploadedFilesCacheDir, { recursive: true });

  const statePath = path.join(workspaceDir, "state.json");

  const initialState = await setupInitialState(statePath);
  const store = setupReduxStore(initialState);

  const { io, url } = await setupWebServer(
    httpPort,
    uploadedFilesDir,
    uploadedFilesCacheDir
  );

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
