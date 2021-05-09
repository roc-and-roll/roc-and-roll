import { createEntityAdapter, createReducer } from "@reduxjs/toolkit";
import {
  playerAdd,
  playerRemove,
  playerUpdate,
  playerUpdateAddCharacterId,
} from "../../shared/actions";
import {
  byId,
  initialSyncedState,
  PlayersSyncedState,
  RRPlayer,
} from "../../shared/state";

const playersAdapter = createEntityAdapter<RRPlayer>();

export const playersReducer = createReducer(
  initialSyncedState.players,
  (builder) => {
    builder
      .addCase(playerAdd, playersAdapter.addOne)
      .addCase(playerUpdate, playersAdapter.updateOne)
      .addCase(playerUpdateAddCharacterId, (state, action) => {
        const player = byId(
          (state as PlayersSyncedState).entities,
          action.payload.id
        );
        player?.characterIds.push(action.payload.characterId);
      })
      .addCase(playerRemove, playersAdapter.removeOne);
  }
);
