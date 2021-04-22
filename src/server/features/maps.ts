import { createEntityAdapter, createReducer, isAnyOf } from "@reduxjs/toolkit";
import {
  mapAdd,
  mapUpdate,
  mapRemove,
  mapTokenAdd,
  mapTokenUpdate,
  mapTokenRemove,
} from "../../shared/actions";
import {
  byId,
  initialSyncedState,
  MapsSyncedState,
  RRMap,
  RRTokenOnMap,
} from "../../shared/state";

const mapsAdapter = createEntityAdapter<RRMap>();
const mapTokensAdapter = createEntityAdapter<RRTokenOnMap>();

export const mapsReducer = createReducer(initialSyncedState.maps, (builder) => {
  builder
    .addCase(mapAdd, mapsAdapter.addOne)
    .addCase(mapUpdate, mapsAdapter.updateOne)
    .addCase(mapRemove, mapsAdapter.removeOne)
    .addMatcher(
      isAnyOf(mapTokenAdd, mapTokenUpdate, mapTokenRemove),
      (state, action) => {
        const { mapId } = action.payload;
        const map = byId((state as MapsSyncedState).entities, mapId);
        if (!map) {
          console.error("Trying to update chat message of unknown chat.");
          return state;
        }

        if (mapTokenAdd.match(action)) {
          mapTokensAdapter.addOne(map.tokens, action.payload.tokenOnMap);
        } else if (mapTokenUpdate.match(action)) {
          mapTokensAdapter.updateOne(map.tokens, action.payload.update);
        } else if (mapTokenRemove.match(action)) {
          mapTokensAdapter.removeOne(map.tokens, action.payload.tokenOnMapId);
        }

        return state;
      }
    );
});
