import { createEntityAdapter, createReducer } from "@reduxjs/toolkit";
import {
  ephermalPlayerAdd,
  ephermalPlayerRemove,
  ephermalPlayerUpdate,
} from "../../shared/actions";
import { EphermalPlayer, initialSyncedState } from "../../shared/state";

const ephermalPlayersAdapter = createEntityAdapter<EphermalPlayer>();

export const ephermalPlayersReducer = createReducer(
  initialSyncedState.ephermal.players,
  (builder) => {
    builder
      .addCase(ephermalPlayerAdd, ephermalPlayersAdapter.addOne)
      .addCase(ephermalPlayerUpdate, ephermalPlayersAdapter.updateOne)
      .addCase(ephermalPlayerRemove, ephermalPlayersAdapter.removeOne);
  }
);
