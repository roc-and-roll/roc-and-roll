import { createEntityAdapter, createReducer } from "@reduxjs/toolkit";
import { mapAdd, mapUpdate, mapRemove } from "../../shared/actions";
import { initialSyncedState, RRMap } from "../../shared/state";

const mapsAdapter = createEntityAdapter<RRMap>();

export const mapsReducer = createReducer(initialSyncedState.maps, (builder) => {
  builder
    .addCase(mapAdd, mapsAdapter.addOne)
    .addCase(mapUpdate, mapsAdapter.updateOne)
    .addCase(mapRemove, mapsAdapter.removeOne);
});
