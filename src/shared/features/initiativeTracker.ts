import { createEntityAdapter, createReducer, original } from "@reduxjs/toolkit";
import {
  initiativeTrackerSetVisible,
  initiativeTrackerSetCurrentEntry,
  initiativeTrackerEntryRemove,
  initiativeTrackerEntryCharacterAdd,
  initiativeTrackerEntryLairActionAdd,
  initiativeTrackerEntryCharacterUpdate,
  initiativeTrackerEntryLairActionUpdate,
} from "../actions";
import {
  initialSyncedState,
  InitiativeTrackerSyncedState,
  RRInitiativeTrackerEntry,
} from "../state";

// Automatically sort all entries by their initiative
const config = {
  sortComparer: <
    A extends RRInitiativeTrackerEntry,
    B extends RRInitiativeTrackerEntry
  >(
    a: A,
    b: B
  ) => b.initiative - a.initiative,
};

const initiativeTrackerEntryAdapter =
  createEntityAdapter<RRInitiativeTrackerEntry>(config);

const initiativeTrackerEntriesReducer = createReducer(
  initialSyncedState.initiativeTracker.entries,
  (builder) => {
    builder
      .addCase(
        initiativeTrackerEntryCharacterAdd,
        initiativeTrackerEntryAdapter.addOne
      )
      .addCase(
        initiativeTrackerEntryLairActionAdd,
        initiativeTrackerEntryAdapter.addOne
      )
      .addCase(
        initiativeTrackerEntryCharacterUpdate,
        initiativeTrackerEntryAdapter.updateOne
      )
      .addCase(
        initiativeTrackerEntryLairActionUpdate,
        initiativeTrackerEntryAdapter.updateOne
      )
      .addCase(
        initiativeTrackerEntryRemove,
        initiativeTrackerEntryAdapter.removeOne
      );
  }
);

export const initiativeTrackerReducer = createReducer(
  initialSyncedState.initiativeTracker,
  (builder) => {
    builder
      .addCase(initiativeTrackerSetVisible, (state, action) => {
        state.visible = action.payload;
      })
      .addCase(initiativeTrackerSetCurrentEntry, (state, action) => {
        state.currentEntryId = action.payload;
      })
      .addDefaultCase((state, action) => {
        state.entries = initiativeTrackerEntriesReducer(
          original(state.entries) as InitiativeTrackerSyncedState["entries"],
          action
        );
      });
  }
);
