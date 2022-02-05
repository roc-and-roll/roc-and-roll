import { createEntityAdapter, createReducer } from "@reduxjs/toolkit";
import {
  playerAdd,
  playerRemove,
  playerUpdate,
  playerUpdateAddFavoriteAssetId,
  playerUpdateAddCharacterId,
  playerUpdateRemoveFavoriteAssetId,
} from "../actions";
import { initialSyncedState, RRPlayer } from "../state";

const playersAdapter = createEntityAdapter<RRPlayer>();

export const playersReducer = createReducer(
  initialSyncedState.players,
  (builder) => {
    builder
      .addCase(playerAdd, playersAdapter.addOne)
      .addCase(playerUpdate, playersAdapter.updateOne)
      .addCase(playerUpdateAddCharacterId, (state, action) => {
        const player = state.entities[action.payload.id];
        player?.characterIds.push(action.payload.characterId);
      })
      .addCase(playerUpdateAddFavoriteAssetId, (state, action) => {
        const player = state.entities[action.payload.id];
        player?.favoriteAssetIds.push(action.payload.assetId);
      })
      .addCase(playerUpdateRemoveFavoriteAssetId, (state, action) => {
        const player = state.entities[action.payload.id];
        const index = player?.favoriteAssetIds.indexOf(action.payload.assetId);
        if (index !== undefined && index >= 0) {
          player?.favoriteAssetIds.splice(index, 1);
        }
      })
      .addCase(playerRemove, playersAdapter.removeOne);
  }
);
