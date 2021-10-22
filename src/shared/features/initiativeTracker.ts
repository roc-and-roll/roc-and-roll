import { createEntityAdapter, createReducer } from "@reduxjs/toolkit";
import {
  initiativeTrackerSetVisible,
  initiativeTrackerSetCurrentEntry,
  initiativeTrackerEntryRemove,
  initiativeTrackerEntryCharacterAdd,
  initiativeTrackerEntryLairActionAdd,
  initiativeTrackerEntryCharacterUpdate,
  initiativeTrackerEntryLairActionUpdate,
} from "../actions";
import { initialSyncedState, RRInitiativeTrackerEntry } from "../state";

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
      );
    // This case is handled below, since it needs access to currentEntryId.
    // .addCase(
    //   initiativeTrackerEntryRemove,
    //   initiativeTrackerEntryAdapter.removeOne
    // );
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
      .addCase(initiativeTrackerEntryRemove, (state, action) => {
        // If we're removing the current entry, we make the next entry the
        // current entry.
        const { payload: id } = action;

        if (state.currentEntryId === id) {
          let idx = state.entries.ids.indexOf(id);
          if (idx !== -1) {
            if (state.entries.ids.length === 1) {
              state.currentEntryId = null;
            } else {
              idx = (idx + 1) % state.entries.ids.length;

              state.currentEntryId = state.entries.ids[idx]!;
            }
          }
        }

        state.entries = initiativeTrackerEntryAdapter.removeOne(
          state.entries,
          action
        );
      })
      .addDefaultCase((state, action) => {
        state.entries = initiativeTrackerEntriesReducer(state.entries, action);
      });
  }
);
