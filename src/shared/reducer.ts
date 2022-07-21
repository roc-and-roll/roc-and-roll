import {
  AnyAction,
  combineReducers,
  createNextState,
  Reducer,
  Draft,
} from "@reduxjs/toolkit";
import { initiativeTrackerReducer } from "../shared/features/initiativeTracker";
import { playersReducer } from "../shared/features/players";
import { charactersReducer } from "../shared/features/characters";
import { mapsReducer } from "../shared/features/maps";
import { privateChatsReducer } from "../shared/features/privateChats";
import { logEntriesReducer } from "../shared/features/logEntries";
import { initialSyncedState, RRCharacter, SyncedState } from "../shared/state";
import {
  ephemeralPlayersReducer,
  ephemeralMusicReducer,
} from "../shared/features/ephemeral";
import { assetsReducer } from "../shared/features/assets";
import { globalSettingsReducer } from "../shared/features/globalSettings";
import { soundSetsReducer } from "./features/soundSets";
import { initiativeTrackerSetCurrentEntry } from "./actions";

const baseReducer = combineReducers({
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

function forEachCharacterInCurrentInitiativeEntry(
  state: SyncedState,
  updater: (character: Draft<RRCharacter>) => void
): SyncedState {
  if (!state.initiativeTracker.currentEntryId) return state;

  const currentInitiativeEntry =
    state.initiativeTracker.entries.entities[
      state.initiativeTracker.currentEntryId
    ];
  if (!currentInitiativeEntry || currentInitiativeEntry.type === "lairAction")
    return state;

  return createNextState(state, (state) => {
    currentInitiativeEntry.characterIds.forEach((id) => {
      const characterEntry = state.characters.entities[id];
      if (characterEntry) {
        updater(characterEntry);
      }
    });
  });
}

// This higher order reducer enhances the provided reducer with support for
// automatically decrementing the number of rounds left on concentration spells
// when the initiative tracker advances to the next entry.
const withCharacterConcentrationReducer =
  (reducer: Reducer<SyncedState, AnyAction>): Reducer<SyncedState, AnyAction> =>
  (state = initialSyncedState, action) => {
    if (!initiativeTrackerSetCurrentEntry.match(action)) {
      return reducer(state, action);
    }
    if (
      !action.payload ||
      !state.initiativeTracker.currentEntryId ||
      state.initiativeTracker.currentEntryId === action.payload ||
      !state.initiativeTracker.entries.entities[
        state.initiativeTracker.currentEntryId
      ]
    ) {
      // If initiative starts or ends, or is set to the same entry that was
      // already selected, do nothing in regard to concentration spells.
      return reducer(state, action);
    }

    // At the end of the turn, delete all concentration spells that have reached
    // their end.
    state = forEachCharacterInCurrentInitiativeEntry(state, (character) => {
      if (
        character.currentlyConcentratingOn &&
        character.currentlyConcentratingOn.roundsLeft <= 0
      ) {
        character.currentlyConcentratingOn = null;
      }
    });

    // Update initiative tracker to the new initiative entry.
    state = reducer(state, action);
    if (state.initiativeTracker.currentEntryId !== action.payload) {
      throw new Error(
        "Current initiative entry does not match action payload.\
           This should never happen."
      );
    }

    // At the start of the turn, decrement the rounds left for all active
    // concentration spells.
    state = forEachCharacterInCurrentInitiativeEntry(state, (character) => {
      if (character.currentlyConcentratingOn) {
        character.currentlyConcentratingOn.roundsLeft--;
      }
    });

    return state;
  };

export const reducer: Reducer<SyncedState, AnyAction> =
  withCharacterConcentrationReducer(baseReducer);
