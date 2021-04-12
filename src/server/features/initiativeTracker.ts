import {
  combineReducers,
  createEntityAdapter,
  createReducer,
  original,
} from "@reduxjs/toolkit";
import {
  initiativeTrackerAdd,
  initiativeTrackerUpdate,
  initiativeTrackerRemove,
  initiativeTrackerSetVisible,
  initiativeTrackersetCurrentEntry,
} from "../../shared/actions";
import {
  initialSyncedState,
  InitiativeTrackerSyncedState,
  RRInitiativeTrackerEntry,
} from "../../shared/state";

const initiativeTrackerEntriesAdapter = createEntityAdapter<RRInitiativeTrackerEntry>();

const initiativeTrackerEntriesReducer = createReducer(
  initialSyncedState.initiativeTracker.entries,
  (builder) => {
    // @ts-expect-error Typescript doesn't like me.
    builder
      .addCase(initiativeTrackerAdd, initiativeTrackerEntriesAdapter.addOne)
      .addCase(
        initiativeTrackerUpdate,
        initiativeTrackerEntriesAdapter.updateOne
      )
      .addCase(
        initiativeTrackerRemove,
        initiativeTrackerEntriesAdapter.removeOne
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
