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
  playerAddDiceTemplatePart,
  playerRemoveDiceTemplatePart,
  playerUpdateDiceTemplatePart,
  playerAddDiceTemplateCategory,
  playerUpdateDiceTemplateCategory,
  playerDeleteDiceTemplateCategory,
} from "../actions";
import {
  EntityCollection,
  initialSyncedState,
  RRDiceTemplateCategoryID,
  RRDiceTemplateID,
  RRDiceTemplatePartID,
  RRPlayer,
  RRPlayerID,
} from "../state";
import { RRDiceTemplate } from "../validation";

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
        if (!category) return;
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
        const template = getTemplateForPayload(state, {
          ...action.payload,
          templateId: action.payload.template.id,
        });
        if (!template) return;
        Object.assign(template, action.payload.template.changes);
      })

      .addCase(playerUpdateDiceTemplatePart, (state, action) => {
        const part = getPartForPayload(state, action.payload);
        if (!part) return;
        Object.assign(part, action.payload.part.changes);
      })

      .addCase(playerAddDiceTemplatePart, (state, action) => {
        const template = getTemplateForPayload(state, action.payload);
        if (!template) return;
        template.parts.push(action.payload.part);
      })

      .addCase(playerRemoveDiceTemplatePart, (state, action) => {
        const template = getTemplateForPayload(state, action.payload);
        if (!template) return;
        const index = template.parts.findIndex(
          (p) => p.id === action.payload.partId
        );
        if (index >= 0) {
          template.parts.splice(index, 1);
        }
      });
  }
);

function getTemplateForPayload(
  state: EntityCollection<RRPlayer>,
  payload: {
    templateId: RRDiceTemplateID;
    id: RRPlayerID;
    categoryId: RRDiceTemplateCategoryID;
  }
) {
  const player = state.entities[payload.id];
  return getTemplateForId(
    payload.templateId,
    player?.diceTemplateCategories.find((c) => c.id === payload.categoryId)
      ?.templates ?? []
  );
}

function getPartForPayload(
  state: EntityCollection<RRPlayer>,
  payload: {
    templateId: RRDiceTemplateID;
    id: RRPlayerID;
    categoryId: RRDiceTemplateCategoryID;
    part: { id: RRDiceTemplatePartID };
  }
) {
  return getTemplateForPayload(state, payload)?.parts.find(
    (p) => p.id === payload.part.id
  );
}

function getTemplateForId(
  id: RRDiceTemplateID,
  templates: RRDiceTemplate[]
): RRDiceTemplate | null {
  for (const template of templates) {
    if (template.id === id) {
      return template;
    }
    for (const part of template.parts) {
      if (part.type === "template") {
        const ret = getTemplateForId(id, [part.template]);
        if (ret !== null) {
          return ret;
        }
      }
    }
  }
  return null;
}
