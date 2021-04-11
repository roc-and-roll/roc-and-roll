import { configureStore } from "@reduxjs/toolkit";
import { SyncedState } from "../shared/state";
import diceRolls from "./features/diceRolls";

const store = configureStore<SyncedState>({
  reducer: {
    // Add new slices of state here.
    // You need to edit SyncedState and initialSyncedState in shared/state.ts
    // when adding a new slice.
    diceRolls,
  },
});

export function setupReduxStore() {
  return store;
}

export type MyStore = typeof store;

// Use SyncedState from shared/state.ts instead!
// export type MyState = ReturnType<typeof store.getState>;

export type MyDispatch = typeof store.dispatch;
