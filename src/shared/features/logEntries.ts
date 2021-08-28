import { createEntityAdapter, createReducer } from "@reduxjs/toolkit";
import {
  logEntryAchievementAdd,
  logEntryDiceRollAdd,
  logEntryMessageAdd,
  logEntryRemove,
} from "../actions";
import { initialSyncedState, RRLogEntry } from "../state";

const logEntryAdapter = createEntityAdapter<RRLogEntry>();

export const logEntriesReducer = createReducer(
  initialSyncedState.logEntries,
  (builder) => {
    builder
      .addCase(logEntryMessageAdd, logEntryAdapter.addOne)
      .addCase(logEntryDiceRollAdd, logEntryAdapter.addOne)
      .addCase(logEntryAchievementAdd, logEntryAdapter.addOne)
      .addCase(logEntryRemove, logEntryAdapter.removeOne);
  }
);
