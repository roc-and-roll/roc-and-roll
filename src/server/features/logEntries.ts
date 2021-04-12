import { createEntityAdapter, createReducer } from "@reduxjs/toolkit";
import {
  logEntryDiceRollAdd,
  logEntryMessageAdd,
  logEntryRemove,
} from "../../shared/actions";
import {
  initialSyncedState,
  RRLogEntry,
  RRLogEntryDiceRoll,
  RRLogEntryMessage,
} from "../../shared/state";

const logEntryAdapter = createEntityAdapter<RRLogEntry>();
const logEntryMessageAdapter = createEntityAdapter<RRLogEntryMessage>();
const logEntryDiceRollAdapter = createEntityAdapter<RRLogEntryDiceRoll>();

export const logEntriesReducer = createReducer(
  initialSyncedState.logEntries,
  (builder) => {
    // @ts-expect-error Typescript doesn't like me.
    builder
      .addCase(logEntryMessageAdd, logEntryMessageAdapter.addOne)
      .addCase(logEntryDiceRollAdd, logEntryDiceRollAdapter.addOne)
      .addCase(logEntryRemove, logEntryAdapter.removeOne);
  }
);
