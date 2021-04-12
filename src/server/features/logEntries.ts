import { createEntityAdapter, createReducer } from "@reduxjs/toolkit";
import {
  logEntryAdd,
  // logEntryUpdate,
  logEntryRemove,
} from "../../shared/actions";
import { initialSyncedState, RRLogEntry } from "../../shared/state";

const logEntriesAdapter = createEntityAdapter<RRLogEntry>();

export const logEntriesReducer = createReducer(
  initialSyncedState.logEntries,
  (builder) => {
    // @ts-expect-error Typescript doesn't like me.
    builder
      .addCase(logEntryAdd, logEntriesAdapter.addOne)
      // .addCase(logEntryUpdate, logEntriesAdapter.updateOne)
      .addCase(logEntryRemove, logEntriesAdapter.removeOne);
  }
);
