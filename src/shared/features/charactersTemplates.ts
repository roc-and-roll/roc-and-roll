import { createEntityAdapter, createReducer } from "@reduxjs/toolkit";
import {
  characterTemplateAdd,
  characterTemplateRemove,
  characterTemplateUpdate,
} from "../actions";
import { initialSyncedState, RRCharacter } from "../state";

const characterTemplatesAdapter = createEntityAdapter<RRCharacter>();

export const characterTemplatesReducer = createReducer(
  initialSyncedState.characterTemplates,
  (builder) => {
    builder
      .addCase(characterTemplateAdd, characterTemplatesAdapter.addOne)
      .addCase(characterTemplateUpdate, characterTemplatesAdapter.updateOne)
      .addCase(characterTemplateRemove, characterTemplatesAdapter.removeOne);
  }
);
