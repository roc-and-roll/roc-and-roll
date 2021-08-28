import { createEntityAdapter, createReducer } from "@reduxjs/toolkit";
import {
  playerAdd,
  playerRemove,
  playerUpdate,
  playerUpdateAddFavoritedAssetId,
  playerUpdateAddCharacterId,
  playerUpdateRemoveFavoritedAssetId,
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
      .addCase(playerUpdateAddFavoritedAssetId, (state, action) => {
        const player = state.entities[action.payload.id];
        player?.favoritedAssetIds.push(action.payload.assetId);
      })
      .addCase(playerUpdateRemoveFavoritedAssetId, (state, action) => {
        const player = state.entities[action.payload.id];
        const index = player?.favoritedAssetIds.indexOf(action.payload.assetId);
        if (index !== undefined && index >= 0) {
          player?.favoritedAssetIds.splice(index, 1);
        }
      })
      .addCase(playerRemove, playersAdapter.removeOne);
  }
);
