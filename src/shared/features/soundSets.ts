import { createEntityAdapter, createReducer } from "@reduxjs/toolkit";
import {
  soundSetAdd,
  soundSetUpdate,
  soundSetRemove,
  soundSetPlaylistEntryRemove,
  soundSetPlaylistAdd,
  soundSetPlaylistEntryAdd,
  soundSetPlaylistEntryMove,
  soundSetPlaylistEntryUpdate,
  soundSetPlaylistUpdate,
  soundSetPlaylistRemove,
} from "../actions";
import { initialSyncedState, RRSoundSet } from "../state";
import { assertNever } from "../util";

const soundSetsAdapter = createEntityAdapter<RRSoundSet>();

export const soundSetsReducer = createReducer(
  initialSyncedState.soundSets,
  (builder) => {
    builder
      .addCase(soundSetAdd, soundSetsAdapter.addOne)
      .addCase(soundSetUpdate, soundSetsAdapter.updateOne)
      .addCase(soundSetRemove, soundSetsAdapter.removeOne)
      .addCase(soundSetPlaylistAdd, (state, action) => {
        const soundSet = state.entities[action.payload.soundSetId];
        if (!soundSet) {
          return;
        }
        soundSet.playlists.push(action.payload.playlist);
      })
      .addCase(soundSetPlaylistUpdate, (state, action) => {
        const soundSet = state.entities[action.payload.soundSetId];
        if (!soundSet) {
          return;
        }

        const playlist = soundSet.playlists.find(
          (playlist) => playlist.id === action.payload.update.id
        );
        if (!playlist) {
          return;
        }

        Object.assign(playlist, action.payload.update.changes);
      })
      .addCase(soundSetPlaylistRemove, (state, action) => {
        const soundSet = state.entities[action.payload.soundSetId];
        if (!soundSet) {
          return;
        }

        const playlistIdx = soundSet.playlists.findIndex(
          (playlist) => playlist.id === action.payload.playlistId
        );
        if (playlistIdx === -1) {
          return;
        }

        soundSet.playlists.splice(playlistIdx, 1);
      })
      .addCase(soundSetPlaylistEntryAdd, (state, action) => {
        const soundSet = state.entities[action.payload.soundSetId];
        if (!soundSet) {
          return;
        }

        const playlist = soundSet.playlists.find(
          (playlist) => playlist.id === action.payload.playlistId
        );
        if (!playlist) {
          return;
        }

        playlist.entries.push(action.payload.playlistEntry);
      })
      .addCase(soundSetPlaylistEntryMove, (state, action) => {
        const soundSet = state.entities[action.payload.soundSetId];
        if (!soundSet) {
          return;
        }

        const playlist = soundSet.playlists.find(
          (playlist) => playlist.id === action.payload.playlistId
        );
        if (!playlist) {
          return;
        }

        const playlistEntryIdx = playlist.entries.findIndex(
          (playlistEntry) => playlistEntry.id === action.payload.playlistEntryId
        );
        if (playlistEntryIdx === -1) {
          return;
        }

        const playlistEntry = playlist.entries[playlistEntryIdx]!;

        playlist.entries.splice(playlistEntryIdx, 1);
        switch (action.payload.direction) {
          case "up":
            playlist.entries.splice(
              Math.max(playlistEntryIdx - 1, 0),
              0,
              playlistEntry
            );
            return;
          case "down":
            playlist.entries.splice(
              Math.min(playlistEntryIdx + 1, playlist.entries.length),
              0,
              playlistEntry
            );
            return;
          default:
            assertNever(action.payload.direction);
        }
      })
      .addCase(soundSetPlaylistEntryUpdate, (state, action) => {
        const soundSet = state.entities[action.payload.soundSetId];
        if (!soundSet) {
          return;
        }

        const playlist = soundSet.playlists.find(
          (playlist) => playlist.id === action.payload.playlistId
        );
        if (!playlist) {
          return;
        }

        const playlistEntry = playlist.entries.find(
          (playlistEntry) => playlistEntry.id === action.payload.update.id
        );
        if (!playlistEntry) {
          return;
        }

        Object.assign(playlistEntry, action.payload.update.changes);
      })
      .addCase(soundSetPlaylistEntryRemove, (state, action) => {
        const soundSet = state.entities[action.payload.soundSetId];
        if (!soundSet) {
          return;
        }

        const playlistIdx = soundSet.playlists.findIndex(
          (playlist) => playlist.id === action.payload.playlistId
        );

        if (playlistIdx === -1) {
          return;
        }

        const playlist = soundSet.playlists[playlistIdx]!;

        const playlistEntryIdx = playlist.entries.findIndex(
          (playlistEntry) => playlistEntry.id === action.payload.playlistEntryId
        );

        if (playlistEntryIdx === -1) {
          return;
        }

        playlist.entries.splice(playlistEntryIdx, 1);

        if (playlist.entries.length === 0) {
          soundSet.playlists.splice(playlistIdx, 1);
        }
      });
  }
);
