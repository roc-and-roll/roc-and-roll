import { configureStore } from "@reduxjs/toolkit";
import { SyncedState } from "../shared/state";

const store = configureStore<SyncedState>({
  // @ts-expect-error TODO: Need to add the reducers here
  reducer: {
    // Add new slices of state here.
    // You need to edit SyncedState and initialSyncedState in shared/state.ts
    // when adding a new slice.
  },
});

export function setupReduxStore() {
  return store;
}

export type MyStore = typeof store;

// Use SyncedState from shared/state.ts instead!
// export type MyState = ReturnType<typeof store.getState>;

export type MyDispatch = typeof store.dispatch;
