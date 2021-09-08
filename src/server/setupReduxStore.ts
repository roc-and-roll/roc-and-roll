import { configureStore } from "@reduxjs/toolkit";
import { SyncedState } from "../shared/state";
import { reducer } from "../shared/reducer";
import { enableBatching } from "redux-batched-actions";

const options = {
  reducer: enableBatching(reducer),
};

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
