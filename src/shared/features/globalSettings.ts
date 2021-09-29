import { createReducer } from "@reduxjs/toolkit";
import { globalSettingsUpdate } from "../actions";
import { initialSyncedState } from "../state";

export const globalSettingsReducer = createReducer(
  initialSyncedState.globalSettings,
  (builder) => {
    builder.addCase(globalSettingsUpdate, (state, action) => {
      Object.assign(state, action.payload);
    });
  }
);
