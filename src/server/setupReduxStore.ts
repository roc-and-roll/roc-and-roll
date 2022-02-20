import {
  configureStore,
  EnhancedStore,
  CombinedState,
  AnyAction,
} from "@reduxjs/toolkit";
import { SyncedState } from "../shared/state";
import { reducer } from "../shared/reducer";
import { enableBatching } from "redux-batched-actions";

const options = {
  reducer: enableBatching(reducer),
};

export type MyStore = EnhancedStore<CombinedState<SyncedState>, AnyAction, []>;

export function setupReduxStore(
  preloadedState: SyncedState | undefined
): MyStore {
  const store = configureStore<SyncedState, AnyAction, []>({
    ...options,
    preloadedState,
  });

  return store;
}

// Use SyncedState from shared/state.ts instead!
// export type MyState = ReturnType<typeof store.getState>;

export type MyDispatch = MyStore["dispatch"];
