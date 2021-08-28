import { createEntityAdapter, createReducer } from "@reduxjs/toolkit";
import {
  assetImageAdd,
  assetImageRemove,
  assetImageUpdate,
  assetSongAdd,
  assetSongRemove,
  assetSongUpdate,
} from "../actions";
import { initialSyncedState, RRAsset } from "../state";

const assetAdapter = createEntityAdapter<RRAsset>();

export const assetsReducer = createReducer(
  initialSyncedState.assets,
  (builder) => {
    builder
      .addCase(assetImageAdd, assetAdapter.addOne)
      .addCase(assetSongAdd, assetAdapter.addOne)
      .addCase(assetImageUpdate, assetAdapter.updateOne)
      .addCase(assetSongUpdate, assetAdapter.updateOne)
      .addCase(assetImageRemove, assetAdapter.removeOne)
      .addCase(assetSongRemove, assetAdapter.removeOne);
  }
);
