import { createEntityAdapter, createReducer } from "@reduxjs/toolkit";
import {
  ephermalPlayerAdd,
  ephermalPlayerRemove,
  ephermalPlayerUpdate,
  ephermalSongAdd,
  ephermalSongRemove,
  ephermalSongUpdate,
} from "../actions";
import { EphermalPlayer, initialSyncedState, RRActiveSong } from "../state";

const ephermalPlayersAdapter = createEntityAdapter<EphermalPlayer>();

const ephermalSongsAdapter = createEntityAdapter<RRActiveSong>();

export const ephermalPlayersReducer = createReducer(
  initialSyncedState.ephermal.players,
  (builder) => {
    builder
      .addCase(ephermalPlayerAdd, ephermalPlayersAdapter.addOne)
      .addCase(ephermalPlayerUpdate, ephermalPlayersAdapter.updateOne)
      .addCase(ephermalPlayerRemove, ephermalPlayersAdapter.removeOne);
  }
);

export const ephermalSongsReducer = createReducer(
  initialSyncedState.ephermal.activeSongs,
  (builder) => {
    builder
      .addCase(ephermalSongAdd, ephermalSongsAdapter.addOne)
      .addCase(ephermalSongUpdate, ephermalSongsAdapter.updateOne)
      .addCase(ephermalSongRemove, ephermalSongsAdapter.removeOne);
  }
);
