import {
  createEntityAdapter,
  createReducer,
  Draft,
  isAnyOf,
} from "@reduxjs/toolkit";
import {
  mapAdd,
  mapUpdate,
  mapRemove,
  mapObjectAdd,
  mapObjectUpdate,
  mapObjectRemove,
  mapSettingsUpdate,
} from "../actions";
import { byId, initialSyncedState, RRMap, RRMapObject } from "../state";

const mapsAdapter = createEntityAdapter<RRMap>();
const mapObjectsAdapter = createEntityAdapter<RRMapObject>();

export const mapsReducer = createReducer(initialSyncedState.maps, (builder) => {
  builder
    .addCase(mapAdd, mapsAdapter.addOne)
    .addCase(mapUpdate, mapsAdapter.updateOne)
    .addCase(mapRemove, mapsAdapter.removeOne)
    .addMatcher(
      isAnyOf(mapObjectAdd, mapObjectUpdate, mapObjectRemove),
      (state, action) => {
        const { mapId } = action.payload;
        const map = byId<Draft<RRMap>>(state.entities, mapId);
        if (!map) {
          console.error("Trying to update map object of unknown map.");
          return state;
        }

        if (mapObjectAdd.match(action)) {
          mapObjectsAdapter.addOne(map.objects, action.payload.mapObject);
        } else if (mapObjectUpdate.match(action)) {
          mapObjectsAdapter.updateOne(map.objects, action.payload.update);
        } else if (mapObjectRemove.match(action)) {
          mapObjectsAdapter.removeOne(map.objects, action.payload.mapObjectId);
        }
      }
    )
    .addMatcher(isAnyOf(mapSettingsUpdate), (state, action) => {
      const { id: mapId } = action.payload;
      const map = byId<Draft<RRMap>>(state.entities, mapId);
      if (!map) {
        console.error("Trying to update map settings of unknown map.");
        return state;
      }

      map.settings = {
        ...map.settings,
        ...action.payload.changes,
      };
    });
});
