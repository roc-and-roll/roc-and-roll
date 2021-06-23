import { createEntityAdapter, createReducer } from "@reduxjs/toolkit";
import {
  ephemeralPlayerAdd,
  ephemeralPlayerRemove,
  ephemeralPlayerUpdate,
  ephemeralSongAdd,
  ephemeralSongRemove,
  ephemeralSongUpdate,
} from "../actions";
import { EphermalPlayer, initialSyncedState, RRActiveSong } from "../state";

const ephemeralPlayersAdapter = createEntityAdapter<EphermalPlayer>();

const ephemeralSongsAdapter = createEntityAdapter<RRActiveSong>();

export const ephemeralPlayersReducer = createReducer(
  initialSyncedState.ephemeral.players,
  (builder) => {
    builder
      .addCase(ephemeralPlayerAdd, ephemeralPlayersAdapter.addOne)
      .addCase(ephemeralPlayerUpdate, ephemeralPlayersAdapter.updateOne)
      .addCase(ephemeralPlayerRemove, ephemeralPlayersAdapter.removeOne);
  }
);

export const ephemeralSongsReducer = createReducer(
  initialSyncedState.ephemeral.activeSongs,
  (builder) => {
    builder
      .addCase(ephemeralSongAdd, ephemeralSongsAdapter.addOne)
      .addCase(ephemeralSongUpdate, ephemeralSongsAdapter.updateOne)
      .addCase(ephemeralSongRemove, ephemeralSongsAdapter.removeOne);
  }
);
