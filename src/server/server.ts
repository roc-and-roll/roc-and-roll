import { setupReduxStore } from "./setupReduxStore";
import { setupStateSync } from "./setupStateSync";
import { setupWebServer } from "./setupWebServer";
import path from "path";
import fs from "fs";
import { setupStatePersistence } from "./setupStatePersistence";
import { entries } from "../shared/state";
import { ephemeralPlayerUpdate } from "../shared/actions";
import { setupArgs } from "./setupArgs";
import { setupInitialState } from "./setupInitialState";
import { setupTabletopAudioTrackSync } from "./setupTabletopAudio";
import { batchActions } from "redux-batched-actions";
import { assertFFprobeIsInstalled } from "./files";
import { extractForOneShot } from "./extractForOneShot";
import { setupClientBuildHashSubject } from "./setupClientBuildHashSubject";

void (async () => {
  const {
    workspace: workspaceDir,
    quiet,
    ...commandAndOptions
  } = await setupArgs();

  await assertFFprobeIsInstalled();

  fs.mkdirSync(workspaceDir, { recursive: true });

  const uploadedFilesDir = path.join(workspaceDir, "uploaded-files");
  fs.mkdirSync(uploadedFilesDir, { recursive: true });

  const uploadedFilesCacheDir = path.join(uploadedFilesDir, "cache");
  fs.mkdirSync(uploadedFilesCacheDir, { recursive: true });

  const statePath = path.join(workspaceDir, "state.json");

  const initialState = await setupInitialState(statePath, uploadedFilesDir);
  const store = setupReduxStore(initialState);

  if (commandAndOptions.command === "extractForOneShot") {
    await extractForOneShot(store, commandAndOptions.outputFilePath);
    return;
  }

  const { port: httpPort, host: httpHost } = commandAndOptions;

  const { io, url } = await setupWebServer(
    httpHost,
    httpPort,
    uploadedFilesDir,
    uploadedFilesCacheDir
  );

  // Sadly, this gets way too slow when you have a big state, see #186.
  //
  //   if (process.env.NODE_ENV !== "production") {
  //     store.subscribe(() => {
  //       const validationResult = isSyncedState.safeParse(store.getState());
  //       if (!validationResult.success) {
  //         console.error(validationResult.error);
  //         console.error(`
  // #############################################
  // #############################################
  //
  // Your state is invalid. This can lead to bugs.
  //
  // This should not have happened!
  //
  // #############################################
  // #############################################`);
  //       }
  //     });
  //   }

  const clientBuildHashSubject = await setupClientBuildHashSubject();

  setupStateSync(io, store, clientBuildHashSubject, quiet);

  setupStatePersistence(store, statePath);

  await setupTabletopAudioTrackSync(store);

  // Delete mouse position if it has not changed for some time.
  const DELETE_MOUSE_POSITION_TIME_THRESHOLD = 60 * 1000;
  setInterval(() => {
    const now = Date.now();
    const state = store.getState();
    const actions = entries(state.ephemeral.players)
      .filter(
        (each) =>
          each.mapMouse &&
          now - each.mapMouse.lastUpdate > DELETE_MOUSE_POSITION_TIME_THRESHOLD
      )
      .map((each) =>
        ephemeralPlayerUpdate({
          id: each.id,
          changes: { mapMouse: null },
        })
      );
    if (actions.length > 0) {
      store.dispatch(batchActions(actions));
    }
  }, 2000);

  console.log(`Roc & Roll started at ${url}.`);
  console.log(`Files are stored in ${workspaceDir}.`);
})();
