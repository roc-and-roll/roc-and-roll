import { createEntityAdapter, createReducer } from "@reduxjs/toolkit";
import {
  characterAdd,
  characterUpdate,
  characterRemove,
} from "../../shared/actions";
import { initialSyncedState, RRCharacter } from "../../shared/state";

const charactersAdapter = createEntityAdapter<RRCharacter>();

export const charactersReducer = createReducer(
  initialSyncedState.characters,
  (builder) => {
    builder
      .addCase(characterAdd, charactersAdapter.addOne)
      .addCase(characterUpdate, charactersAdapter.updateOne)
      .addCase(characterRemove, charactersAdapter.removeOne);
  }
);
