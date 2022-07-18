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
import assert from "assert";
import { initiativeTrackerSetCurrentEntry } from "./actions";

const combinedReducer = combineReducers({
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

const specialCharacterReducer = createReducer(initialSyncedState, (builder) => {
  builder.addCase(initiativeTrackerSetCurrentEntry, (state, action) => {
    if (!state.initiativeTracker.currentEntryId) return;
    const newInitiativeEntry =
      state.initiativeTracker.entries.entities[
        state.initiativeTracker.currentEntryId
      ];
    // should have already been updated by the call to `intermediateState = combinedReducer(state, action)` at the bottom
    assert(state.initiativeTracker.currentEntryId === action.payload);
    if (!newInitiativeEntry || newInitiativeEntry.type === "lairAction") return;
    newInitiativeEntry.characterIds.map((id) => {
      const characterEntry = state.characters.entities[id];
      if (characterEntry?.currentlyConcentratingOn) {
        characterEntry.currentlyConcentratingOn.roundsLeft--;
      }
    });
  });
});

function crossSliceReducer(state: SyncedState, action: AnyAction) {
  switch (action.type) {
    case initiativeTrackerSetCurrentEntry.toString(): {
      return {
        ...state,
        characters: specialCharacterReducer(state, action).characters,
      };
    }
    default:
      return state;
  }
}

export function reducer(state: SyncedState, action: AnyAction): SyncedState {
  const intermediateState = combinedReducer(state, action);
  const finalState = crossSliceReducer(intermediateState, action);
  return finalState;
}
