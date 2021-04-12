import { createEntityAdapter, createReducer } from "@reduxjs/toolkit";
import { playerAdd, playerRemove, playerUpdate } from "../../shared/actions";
import { initialSyncedState, RRPlayer } from "../../shared/state";

const playersAdapter = createEntityAdapter<RRPlayer>();

export const playersReducer = createReducer(
  initialSyncedState.players,
  (builder) => {
    builder
      .addCase(playerAdd, playersAdapter.addOne)
      .addCase(playerUpdate, playersAdapter.updateOne)
      .addCase(playerRemove, playersAdapter.removeOne);
  }
);
