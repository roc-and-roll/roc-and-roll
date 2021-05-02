import { createEntityAdapter, createReducer } from "@reduxjs/toolkit";
import {
  diceTemplateAdd,
  diceTemplateRemove,
  diceTemplateUpdate,
} from "../../shared/actions";
import { RRDiceTemplate, initialSyncedState } from "../../shared/state";

const diceTemplatesAdapter = createEntityAdapter<RRDiceTemplate>();

export const diceTemplatesReducer = createReducer(
  initialSyncedState.diceTemplates,
  (builder) => {
    builder
      .addCase(diceTemplateAdd, diceTemplatesAdapter.addOne)
      .addCase(diceTemplateUpdate, diceTemplatesAdapter.updateOne)
      .addCase(diceTemplateRemove, diceTemplatesAdapter.removeOne);
  }
);
