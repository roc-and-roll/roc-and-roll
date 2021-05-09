import { createEntityAdapter, createReducer } from "@reduxjs/toolkit";
import {
  logEntryAchievementAdd,
  logEntryDiceRollAdd,
  logEntryMessageAdd,
  logEntryRemove,
} from "../../shared/actions";
import {
  initialSyncedState,
  RRLogEntry,
  RRLogEntryAchievement,
  RRLogEntryDiceRoll,
  RRLogEntryMessage,
} from "../../shared/state";

const logEntryAdapter = createEntityAdapter<RRLogEntry>();
const logEntryMessageAdapter = createEntityAdapter<RRLogEntryMessage>();
const logEntryDiceRollAdapter = createEntityAdapter<RRLogEntryDiceRoll>();
const logEntryAchievemenAdapter = createEntityAdapter<RRLogEntryAchievement>();

export const logEntriesReducer = createReducer(
  initialSyncedState.logEntries,
  (builder) => {
    builder
      .addCase(logEntryMessageAdd, logEntryMessageAdapter.addOne)
      .addCase(logEntryDiceRollAdd, logEntryDiceRollAdapter.addOne)
      .addCase(logEntryAchievementAdd, logEntryAchievemenAdapter.addOne)
      .addCase(logEntryRemove, logEntryAdapter.removeOne);
  }
);
