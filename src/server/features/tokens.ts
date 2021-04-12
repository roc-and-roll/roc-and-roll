import { createEntityAdapter, createReducer } from "@reduxjs/toolkit";
import { tokenAdd, tokenUpdate, tokenRemove } from "../../shared/actions";
import { initialSyncedState, RRToken } from "../../shared/state";

const tokensAdapter = createEntityAdapter<RRToken>();

export const tokensReducer = createReducer(
  initialSyncedState.tokens,
  (builder) => {
    builder
      .addCase(tokenAdd, tokensAdapter.addOne)
      .addCase(tokenUpdate, tokensAdapter.updateOne)
      .addCase(tokenRemove, tokensAdapter.removeOne);
  }
);
