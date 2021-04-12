import { configureStore } from "@reduxjs/toolkit";
import { initiativeTrackerReducer } from "./features/initiativeTracker";
import { playersReducer } from "./features/players";
import { tokensReducer } from "./features/tokens";
import { mapsReducer } from "./features/maps";
import { privateChatsReducer } from "./features/privateChats";
import { logEntriesReducer } from "./features/logEntries";

const store = configureStore({
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
});

export function setupReduxStore() {
  return store;
}

export type MyStore = typeof store;

// Use SyncedState from shared/state.ts instead!
// export type MyState = ReturnType<typeof store.getState>;

export type MyDispatch = typeof store.dispatch;
