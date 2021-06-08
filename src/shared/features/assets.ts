import { createEntityAdapter, createReducer } from "@reduxjs/toolkit";
import {
  assetImageAdd,
  assetImageRemove,
  assetImageUpdate,
  assetSongAdd,
  assetSongRemove,
  assetSongUpdate,
} from "../actions";
import { initialSyncedState, RRImage, RRSong } from "../state";

const assetsImageAdapter = createEntityAdapter<RRImage>();
const assetsSongAdapter = createEntityAdapter<RRSong>();

export const assetsReducer = createReducer(
  initialSyncedState.assets,
  (builder) => {
    builder
      .addCase(assetImageAdd, assetsImageAdapter.addOne)
      .addCase(assetSongAdd, assetsSongAdapter.addOne)
      .addCase(assetImageUpdate, assetsImageAdapter.updateOne)
      .addCase(assetSongUpdate, assetsSongAdapter.updateOne)
      .addCase(assetImageRemove, assetsImageAdapter.removeOne)
      .addCase(assetSongRemove, assetsSongAdapter.removeOne);
  }
);
