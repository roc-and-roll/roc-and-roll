import { createEntityAdapter, createReducer, original } from "@reduxjs/toolkit";
import {
  initiativeTrackerSetVisible,
  initiativeTrackersetCurrentEntry,
  initiativeTrackerEntryRemove,
  initiativeTrackerEntryTokenAdd,
  initiativeTrackerEntryLayerActionAdd,
  initiativeTrackerEntryTokenUpdate,
  initiativeTrackerEntryLayerActionUpdate,
} from "../../shared/actions";
import {
  initialSyncedState,
  InitiativeTrackerSyncedState,
  RRInitiativeTrackerEntry,
  RRInitiativeTrackerEntryLayerAction,
  RRInitiativeTrackerEntryToken,
} from "../../shared/state";

// Automatically sort all entries by their initiative
const config = {
  sortComparer: <
    A extends RRInitiativeTrackerEntry,
    B extends RRInitiativeTrackerEntry
  >(
    a: A,
    b: B
  ) => a.initiative - b.initiative,
};

const initiativeTrackerEntryAdapter = createEntityAdapter<RRInitiativeTrackerEntry>(
  config
);
const initiativeTrackerEntryTokenAdapter = createEntityAdapter<RRInitiativeTrackerEntryToken>(
  config
);
const initiativeTrackerEntryLayerActionAdapter = createEntityAdapter<RRInitiativeTrackerEntryLayerAction>(
  config
);

const initiativeTrackerEntriesReducer = createReducer(
  initialSyncedState.initiativeTracker.entries,
  (builder) => {
    builder
      .addCase(
        initiativeTrackerEntryTokenAdd,
        initiativeTrackerEntryTokenAdapter.addOne
      )
      .addCase(
        initiativeTrackerEntryLayerActionAdd,
        initiativeTrackerEntryLayerActionAdapter.addOne
      )
      .addCase(
        initiativeTrackerEntryTokenUpdate,
        initiativeTrackerEntryTokenAdapter.updateOne
      )
      .addCase(
        initiativeTrackerEntryLayerActionUpdate,
        initiativeTrackerEntryLayerActionAdapter.updateOne
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
      .addCase(initiativeTrackersetCurrentEntry, (state, action) => {
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
