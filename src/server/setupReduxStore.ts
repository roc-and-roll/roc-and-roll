import { configureStore } from "@reduxjs/toolkit";
import { initiativeTrackerReducer } from "./features/initiativeTracker";
import { playersReducer } from "./features/players";
import { tokensReducer } from "./features/tokens";
import { mapsReducer } from "./features/maps";
import { privateChatsReducer } from "./features/privateChats";
import { logEntriesReducer } from "./features/logEntries";
import { SyncedState } from "../shared/state";

const options = {
  reducer: {
    // Add new slices of state here.
    // You need to edit SyncedState and initialSyncedState in shared/state.ts
    // when adding a new slice.
    initiativeTracker: initiativeTrackerReducer,
    players: playersReducer,
    tokens: tokensReducer,
    maps: mapsReducer,
    privateChats: privateChatsReducer,
    logEntries: logEntriesReducer,
  },
} as const;

export function setupReduxStore(preloadedState: SyncedState | undefined) {
  const store = configureStore({
    ...options,
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
