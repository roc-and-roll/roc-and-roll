import { AnyAction, configureStore } from "@reduxjs/toolkit";
import { MyState } from "../shared/state";
import diceRolls from "./features/diceRolls";

const store = configureStore<MyState>({
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

export type MyAction = AnyAction;
