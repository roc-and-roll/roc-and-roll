import { createEntityAdapter, createReducer } from "@reduxjs/toolkit";
import {
  characterAdd,
  characterUpdate,
  characterRemove,
  mapObjectRemove,
} from "../actions";
import { initialSyncedState, RRCharacter } from "../state";

const charactersAdapter = createEntityAdapter<RRCharacter>();

export const charactersReducer = createReducer(
  initialSyncedState.characters,
  (builder) => {
    builder
      .addCase(characterAdd, charactersAdapter.addOne)
      .addCase(characterUpdate, charactersAdapter.updateOne)
      .addCase(characterRemove, charactersAdapter.removeOne)
      .addCase(mapObjectRemove, (state, action) => {
        if (action.payload.removeTemplateId) {
          return charactersAdapter.removeOne(
            state,
            action.payload.removeTemplateId
          );
        }
        return state;
      });
  }
);
