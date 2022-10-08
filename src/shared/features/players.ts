import { createEntityAdapter, createReducer } from "@reduxjs/toolkit";
import {
  playerAdd,
  playerRemove,
  playerUpdate,
  playerUpdateAddFavoriteAssetId,
  playerUpdateAddCharacterId,
  playerUpdateRemoveFavoriteAssetId,
  playerUpdateAddInventoryId,
  playerUpdateRemoveInventoryId,
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
      .addCase(playerUpdateAddInventoryId, (state, action) => {
        const player = state.entities[action.payload.id];
        player?.inventoryIds.push(action.payload.inventoryId);
      })
      .addCase(playerUpdateRemoveInventoryId, (state, action) => {
        const player = state.entities[action.payload.id];
        const index = player?.inventoryIds.indexOf(action.payload.inventoryId);
        if (index !== undefined && index >= 0) {
          player?.inventoryIds.splice(index, 1);
        }
      })
      .addCase(playerRemove, playersAdapter.removeOne);
  }
);
