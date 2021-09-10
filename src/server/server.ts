import { setupReduxStore } from "./setupReduxStore";
import { setupStateSync } from "./setupStateSync";
import { setupWebServer } from "./setupWebServer";
import path from "path";
import fs from "fs";
import { setupStatePersistence } from "./setupStatePersistence";
import { entries } from "../shared/state";
import { ephemeralPlayerUpdate } from "../shared/actions";
import { setupArgs } from "./setupArgs";
import { isSyncedState } from "../shared/validation";
import { setupInitialState } from "./setupInitialState";
import { setupTabletopAudioTrackSync } from "./setupTabletopaudio";
import { batchActions } from "redux-batched-actions";
import { assertFFprobeIsInstalled } from "./files";

void (async () => {
  const { workspace: workspaceDir, quiet, port: httpPort } = setupArgs();

  await assertFFprobeIsInstalled();

  fs.mkdirSync(workspaceDir, { recursive: true });

  const uploadedFilesDir = path.join(workspaceDir, "uploaded-files");
  fs.mkdirSync(uploadedFilesDir, { recursive: true });

  const uploadedFilesCacheDir = path.join(uploadedFilesDir, "cache");
  fs.mkdirSync(uploadedFilesCacheDir, { recursive: true });

  const statePath = path.join(workspaceDir, "state.json");

  const initialState = await setupInitialState(statePath, uploadedFilesDir);
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

  await setupTabletopAudioTrackSync(store, workspaceDir);

  // Delete mouse position if it has not changed for some time.
  const DELETE_MOUSE_POSITION_TIME_THRESHOLD = 60 * 1000;
  setInterval(() => {
    const now = Date.now();
    const state = store.getState();
    store.dispatch(
      batchActions(
        entries(state.ephemeral.players)
          .filter(
            (each) =>
              each.mapMouse &&
              now - each.mapMouse.lastUpdate >
                DELETE_MOUSE_POSITION_TIME_THRESHOLD
          )
          .map((each) =>
            ephemeralPlayerUpdate({
              id: each.id,
              changes: { mapMouse: null },
            })
          )
      )
    );
  }, 2000);

  console.log(`Roc & Roll started at ${url}.`);
  console.log(`Files are stored in ${workspaceDir}.`);
})();
