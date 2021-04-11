import { configureStore } from "@reduxjs/toolkit";
import { SyncedState } from "../shared/state";
import diceRolls from "./features/diceRolls";

const store = configureStore<SyncedState>({
  reducer: {
    diceRolls,
  },
});

export function setupReduxStore() {
  return store;
}

export type MyStore = typeof store;

// export type MyState = ReturnType<typeof store.getState>;

export type MyDispatch = typeof store.dispatch;
