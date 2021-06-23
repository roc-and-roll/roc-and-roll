import { combineReducers } from "@reduxjs/toolkit";
import { initiativeTrackerReducer } from "../shared/features/initiativeTracker";
import { playersReducer } from "../shared/features/players";
import { charactersReducer } from "../shared/features/characters";
import { mapsReducer } from "../shared/features/maps";
import { privateChatsReducer } from "../shared/features/privateChats";
import { logEntriesReducer } from "../shared/features/logEntries";
import { initialSyncedState } from "../shared/state";
import {
  ephemeralPlayersReducer,
  ephemeralSongsReducer,
} from "../shared/features/ephemeral";
import { diceTemplatesReducer } from "../shared/features/diceTemplate";
import { assetsReducer } from "../shared/features/assets";
import { characterTemplatesReducer } from "../shared/features/charactersTemplates";
import { globalSettingsReducer } from "../shared/features/globalSettings";

export const reducer = combineReducers({
  // Add new slices of state here.
  // You need to edit SyncedState and initialSyncedState in shared/state.ts
  // when adding a new slice.
  version: (state: number = initialSyncedState.version) => state,
  globalSettings: globalSettingsReducer,
  initiativeTracker: initiativeTrackerReducer,
  players: playersReducer,
  characters: charactersReducer,
  characterTemplates: characterTemplatesReducer,
  maps: mapsReducer,
  privateChats: privateChatsReducer,
  logEntries: logEntriesReducer,
  diceTemplates: diceTemplatesReducer,
  assets: assetsReducer,
  ephemeral: combineReducers({
    players: ephemeralPlayersReducer,
    activeSongs: ephemeralSongsReducer,
  }),
});
