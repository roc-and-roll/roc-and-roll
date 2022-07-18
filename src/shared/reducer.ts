import { AnyAction, combineReducers, createReducer } from "@reduxjs/toolkit";
import { initiativeTrackerReducer } from "../shared/features/initiativeTracker";
import { playersReducer } from "../shared/features/players";
import { charactersReducer } from "../shared/features/characters";
import { mapsReducer } from "../shared/features/maps";
import { privateChatsReducer } from "../shared/features/privateChats";
import { logEntriesReducer } from "../shared/features/logEntries";
import { initialSyncedState, SyncedState } from "../shared/state";
import {
  ephemeralPlayersReducer,
  ephemeralMusicReducer,
} from "../shared/features/ephemeral";
import { assetsReducer } from "../shared/features/assets";
import { globalSettingsReducer } from "../shared/features/globalSettings";
import { soundSetsReducer } from "./features/soundSets";
import { initiativeTrackerSetCurrentEntry } from "./actions";

const singleSliceReducers = combineReducers({
  // Add new slices of state here.
  // You need to edit SyncedState and initialSyncedState in shared/state.ts
  // when adding a new slice.
  version: (state: number = initialSyncedState.version) => state,
  globalSettings: globalSettingsReducer,
  initiativeTracker: initiativeTrackerReducer,
  players: playersReducer,
  characters: charactersReducer,
  maps: mapsReducer,
  privateChats: privateChatsReducer,
  logEntries: logEntriesReducer,
  assets: assetsReducer,
  soundSets: soundSetsReducer,
  ephemeral: combineReducers({
    players: ephemeralPlayersReducer,
    activeMusic: ephemeralMusicReducer,
  }),
});

const onInitiativeChangedCharactersReducer = createReducer(
  initialSyncedState,
  (builder) => {
    builder.addCase(initiativeTrackerSetCurrentEntry, (state, action) => {
      if (!state.initiativeTracker.currentEntryId) return;
      const newInitiativeEntry =
        state.initiativeTracker.entries.entities[
          state.initiativeTracker.currentEntryId
        ];
      if (state.initiativeTracker.currentEntryId !== action.payload) {
        throw new Error(
          "Current initiative entry does not match action payload.\
        This should have been updated by the single slice reducers already."
        );
      }
      if (!newInitiativeEntry || newInitiativeEntry.type === "lairAction")
        return;
      newInitiativeEntry.characterIds.map((id) => {
        const characterEntry = state.characters.entities[id];
        if (characterEntry?.currentlyConcentratingOn) {
          characterEntry.currentlyConcentratingOn.roundsLeft--;
        }
      });
    });
  }
);

const beforeInitiativeChangedCharactersReducer = createReducer(
  initialSyncedState,
  (builder) => {
    builder.addCase(initiativeTrackerSetCurrentEntry, (state, action) => {
      if (!state.initiativeTracker.currentEntryId) return;
      const currentInitiativeEntry =
        state.initiativeTracker.entries.entities[
          state.initiativeTracker.currentEntryId
        ];
      if (state.initiativeTracker.currentEntryId === action.payload) {
        //TODO do we need this? It would fail if we only have one entry I assume
        throw new Error(
          "Current initiative entry matches action payload.\
          This should run before the initiative entry is updated."
        );
      }
      if (
        !currentInitiativeEntry ||
        currentInitiativeEntry.type === "lairAction"
      )
        return;
      currentInitiativeEntry.characterIds.map((id) => {
        const characterEntry = state.characters.entities[id];
        if (
          characterEntry?.currentlyConcentratingOn &&
          characterEntry.currentlyConcentratingOn.roundsLeft <= 0
        ) {
          characterEntry.currentlyConcentratingOn = null;
        }
      });
    });
  }
);

function anotherCrossSlideReducer(state: SyncedState, action: AnyAction) {
  switch (action.type) {
    case initiativeTrackerSetCurrentEntry.toString(): {
      return {
        ...state,
        characters: beforeInitiativeChangedCharactersReducer(state, action)
          .characters,
      };
    }
    default:
      return state;
  }
}

function crossSliceReducer(state: SyncedState, action: AnyAction) {
  switch (action.type) {
    case initiativeTrackerSetCurrentEntry.toString(): {
      return {
        ...state,
        characters: onInitiativeChangedCharactersReducer(state, action)
          .characters,
      };
    }
    default:
      return state;
  }
}

export function reducer(
  state: SyncedState = initialSyncedState,
  action: AnyAction
): SyncedState {
  const firstIntermediateState = anotherCrossSlideReducer(state, action);
  const intermediateState = singleSliceReducers(firstIntermediateState, action);
  const finalState = crossSliceReducer(intermediateState, action);
  return finalState;
}
