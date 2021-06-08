import { createReducer } from "@reduxjs/toolkit";
import { globalSettingsUpdate } from "../actions";
import { initialSyncedState } from "../state";

export const globalSettingsReducer = createReducer(
  initialSyncedState.globalSettings,
  (builder) => {
    builder.addCase(globalSettingsUpdate, (state, action) => {
      console.log(action);
      for (const key in action.payload) {
        (state as any)[key] = (action as any)[key];
      }
    });
  }
);
