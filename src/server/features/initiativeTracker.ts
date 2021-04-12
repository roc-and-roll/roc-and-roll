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

const initiativeTrackerEntryAdapter = createEntityAdapter<RRInitiativeTrackerEntry>();
const initiativeTrackerEntryTokenAdapter = createEntityAdapter<RRInitiativeTrackerEntryToken>();
const initiativeTrackerEntryLayerActionAdapter = createEntityAdapter<RRInitiativeTrackerEntryLayerAction>();

const initiativeTrackerEntriesReducer = createReducer(
  initialSyncedState.initiativeTracker.entries,
  (builder) => {
    // @ts-expect-error Typescript doesn't like me.
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
