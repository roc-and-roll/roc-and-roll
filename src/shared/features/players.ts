import { createEntityAdapter, createReducer } from "@reduxjs/toolkit";
import {
  playerAdd,
  playerRemove,
  playerUpdate,
  playerUpdateAddFavoritedAssetId,
  playerUpdateAddCharacterId,
  playerUpdateRemoveFavoritedAssetId,
  playerAddDiceTemplate,
  playerRemoveDiceTemplate,
  playerUpdateDiceTemplate,
  playerAddDiceTemplateCategory,
  playerUpdateDiceTemplateCategory,
  playerDeleteDiceTemplateCategory,
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
      .addCase(playerRemove, playersAdapter.removeOne)

      .addCase(playerAddDiceTemplate, (state, action) => {
        const player = state.entities[action.payload.id];
        player?.diceTemplateCategories
          .find((c) => c.id === action.payload.categoryId)
          ?.templates.push(action.payload.template);
      })

      .addCase(playerAddDiceTemplateCategory, (state, action) => {
        const player = state.entities[action.payload.id];
        player?.diceTemplateCategories.push(action.payload.category);
      })

      .addCase(playerUpdateDiceTemplateCategory, (state, action) => {
        const player = state.entities[action.payload.id];
        const category = player?.diceTemplateCategories.find(
          (c) => c.id === action.payload.category.id
        );
        Object.assign(category, action.payload.category.changes);
      })

      .addCase(playerDeleteDiceTemplateCategory, (state, action) => {
        const player = state.entities[action.payload.id];
        const index = player?.diceTemplateCategories.findIndex(
          (c) => c.id === action.payload.categoryId
        );
        if (index !== undefined && index >= 0) {
          player?.diceTemplateCategories.splice(index, 1);
        }
      })

      .addCase(playerRemoveDiceTemplate, (state, action) => {
        // TODO go recursive
        const player = state.entities[action.payload.id];
        const templates = player?.diceTemplateCategories.find(
          (c) => c.id === action.payload.categoryId
        )?.templates;
        const index = templates?.findIndex(
          (t) => t.id === action.payload.templateId
        );
        if (index !== undefined && index >= 0) {
          templates?.splice(index, 1);
        }
      })

      .addCase(playerUpdateDiceTemplate, (state, action) => {
        const player = state.entities[action.payload.id];
        const template = player?.diceTemplateCategories
          .find((c) => c.id === action.payload.categoryId)
          ?.templates.find((t) => t.id === action.payload.template.id);
        Object.assign(template, action.payload.template.changes);
      });
  }
);
