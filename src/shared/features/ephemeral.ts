import { createEntityAdapter, createReducer } from "@reduxjs/toolkit";
import {
  ephemeralPlayerAdd,
  ephemeralPlayerRemove,
  ephemeralPlayerUpdate,
  ephemeralMusicAdd,
  ephemeralMusicRemove,
  ephemeralMusicUpdate,
} from "../actions";
import {
  EphemeralPlayer,
  initialSyncedState,
  RRActiveSongOrSoundSet,
} from "../state";

const ephemeralPlayersAdapter = createEntityAdapter<EphemeralPlayer>();

const ephemeralMusicAdapter = createEntityAdapter<RRActiveSongOrSoundSet>();

export const ephemeralPlayersReducer = createReducer(
  initialSyncedState.ephemeral.players,
  (builder) => {
    builder
      .addCase(ephemeralPlayerAdd, ephemeralPlayersAdapter.addOne)
      .addCase(ephemeralPlayerUpdate, ephemeralPlayersAdapter.updateOne)
      .addCase(ephemeralPlayerRemove, ephemeralPlayersAdapter.removeOne);
  }
);

export const ephemeralMusicReducer = createReducer(
  initialSyncedState.ephemeral.activeMusic,
  (builder) => {
    builder
      .addCase(ephemeralMusicAdd, ephemeralMusicAdapter.addOne)
      .addCase(ephemeralMusicUpdate, ephemeralMusicAdapter.updateOne)
      .addCase(ephemeralMusicRemove, ephemeralMusicAdapter.removeOne);
  }
);
