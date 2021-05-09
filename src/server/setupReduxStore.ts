import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { initiativeTrackerReducer } from "./features/initiativeTracker";
import { playersReducer } from "./features/players";
import { charactersReducer } from "./features/characters";
import { mapsReducer } from "./features/maps";
import { privateChatsReducer } from "./features/privateChats";
import { logEntriesReducer } from "./features/logEntries";
import { SyncedState } from "../shared/state";
import {
  ephermalPlayersReducer,
  ephermalSongsReducer,
} from "./features/ephermal";
import { diceTemplatesReducer } from "./features/diceTemplate";
import { assetsReducer } from "./features/assets";
import { characterTemplatesReducer } from "./features/charactersTemplates";

const options = {
  reducer: {
    // Add new slices of state here.
    // You need to edit SyncedState and initialSyncedState in shared/state.ts
    // when adding a new slice.
    initiativeTracker: initiativeTrackerReducer,
    players: playersReducer,
    characters: charactersReducer,
    characterTemplates: characterTemplatesReducer,
    maps: mapsReducer,
    privateChats: privateChatsReducer,
    logEntries: logEntriesReducer,
    diceTemplates: diceTemplatesReducer,
    assets: assetsReducer,
    ephermal: combineReducers({
      players: ephermalPlayersReducer,
      activeSongs: ephermalSongsReducer,
    }),
  },
} as const;

export function setupReduxStore(preloadedState: SyncedState | undefined) {
  const store = configureStore({
    ...options,
    // @ts-expect-error Fix this error
    preloadedState,
  });

  return store;
}

// just for types
const __store = configureStore(options);

export type MyStore = typeof __store;

// Use SyncedState from shared/state.ts instead!
// export type MyState = ReturnType<typeof store.getState>;

export type MyDispatch = typeof __store.dispatch;
