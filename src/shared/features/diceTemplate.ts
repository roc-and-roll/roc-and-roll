import { createEntityAdapter, createReducer } from "@reduxjs/toolkit";
import {
  diceTemplateAdd,
  diceTemplatePartRemove,
  diceTemplatePartUpdate,
  diceTemplateRemove,
  diceTemplateUpdate,
} from "../actions";
import { RRDiceTemplate, initialSyncedState } from "../state";

const diceTemplatesAdapter = createEntityAdapter<RRDiceTemplate>();

export const diceTemplatesReducer = createReducer(
  initialSyncedState.diceTemplates,
  (builder) => {
    builder
      .addCase(diceTemplateAdd, diceTemplatesAdapter.addOne)
      .addCase(diceTemplateUpdate, diceTemplatesAdapter.updateOne)
      .addCase(diceTemplateRemove, diceTemplatesAdapter.removeOne)
      .addCase(
        diceTemplatePartUpdate,
        (state, { payload: { templateId, id, changes } }) => {
          const template = state.entities[templateId];
          const part = template?.parts.find((each) => each.id === id);
          if (part) {
            Object.assign(part, changes);
          }
        }
      )
      .addCase(
        diceTemplatePartRemove,
        (state, { payload: { templateId, id } }) => {
          const template = state.entities[templateId];
          if (!template) {
            return;
          }

          const index = template.parts.findIndex((each) => each.id === id);
          if (index > -1) {
            template.parts.splice(index, 1);
          }
        }
      );
  }
);
