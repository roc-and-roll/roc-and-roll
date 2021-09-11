import { matchSorter } from "match-sorter";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  soundSetAdd,
  soundSetPlaylistAdd,
  soundSetPlaylistEntryAdd,
  soundSetPlaylistEntryMove,
  soundSetPlaylistEntryRemove,
  soundSetPlaylistEntryUpdate,
  soundSetPlaylistRemove,
  soundSetPlaylistUpdate,
} from "../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../shared/constants";
import {
  RRActiveSongOrSoundSet,
  entries,
  RRActiveSoundSet,
  RRSoundSet,
  RRPlaylistID,
  SyncedState,
  RRAssetID,
  RRPlaylist,
} from "../../shared/state";
import { useMyself } from "../myself";
import { useServerDispatch, useServerState } from "../state";
import { formatDuration, highlightMatching } from "../util";
import { CollapseButton } from "./CollapseButton";
import { Dialog, DialogActions, DialogContent, DialogTitle } from "./Dialog";
import { MusicActions } from "./Music";
import { Button } from "./ui/Button";
import { SmartTextInput } from "./ui/TextInput";
import { VolumeSlider } from "./VolumeSlider";
import { useCurrentlyPlayingPlaylistEntryAndSong } from "../sound";
import { useConfirm, usePrompt } from "../popup-boxes";

export const SoundSets = React.memo<{
  filterText: string;
  actions: MusicActions;
  activeMusic: RRActiveSongOrSoundSet[];
}>(function SoundSets({ filterText, actions, activeMusic }) {
  const myself = useMyself();
  const dispatch = useServerDispatch();
  const soundSets = useServerState((state) => state.soundSets);
  const prompt = usePrompt();

  const createSoundSet = async () => {
    const name = (await prompt("Enter a name for the sound set"))?.trim();

    if (name === "" || name === undefined) {
      return;
    }

    dispatch(
      soundSetAdd({
        name,
        description: null,
        playlists: [],
        playerId: myself.id,
      })
    );
  };

  const createNewSoundSetButton = (
    <div className="music-row">
      <div className="music-label" />
      <Button className="music-button" onClick={() => createSoundSet()}>
        create new sound set
      </Button>
    </div>
  );

  const filteredSoundSets = matchSorter(entries(soundSets), filterText, {
    keys: ["name", "description"],
    threshold: matchSorter.rankings.ACRONYM,
  });

  if (filteredSoundSets.length === 0) {
    return (
      <>
        {createNewSoundSetButton}
        <div className="music-row">
          <em>
            no sound sets{" "}
            {soundSets.ids.length === 0 ? "available" : "matching"}
          </em>
        </div>
      </>
    );
  }

  return (
    <>
      {createNewSoundSetButton}
      {filteredSoundSets.map((soundSet) => {
        const activeSongOrSoundSet = activeMusic.find(
          (activeSongOrSoundSet) =>
            activeSongOrSoundSet.type === "soundSet" &&
            soundSet.id === activeSongOrSoundSet.soundSetId
        );
        return (
          <SoundSet
            key={soundSet.id}
            soundSet={soundSet}
            activeSoundSet={
              activeSongOrSoundSet?.type === "soundSet"
                ? activeSongOrSoundSet
                : undefined
            }
            filterText={filterText}
            actions={actions}
          />
        );
      })}
    </>
  );
});

export const ActiveSoundSet = React.memo(function ActiveSoundSet({
  activeSoundSet,
  actions,
}: {
  activeSoundSet: RRActiveSoundSet;
  actions: MusicActions;
}) {
  const soundSet = useServerState(
    (state) => state.soundSets.entities[activeSoundSet.soundSetId]
  );

  return soundSet ? (
    <SoundSet
      soundSet={soundSet}
      activeSoundSet={activeSoundSet}
      filterText=""
      actions={actions}
    />
  ) : null;
});

function SoundSet({
  soundSet,
  activeSoundSet,
  filterText,
  actions: { onAdd, onReplace, onSetVolume, onStop },
}: {
  soundSet: RRSoundSet;
  activeSoundSet?: RRActiveSoundSet;
  filterText: string;
  actions: MusicActions;
}) {
  const numEntries = soundSet.playlists.reduce(
    (count, playlist) => count + playlist.entries.length,
    0
  );

  const [collapsed, setCollapsed] = useState(true);

  return (
    <>
      <div className="music-row">
        <div className="music-label">
          {highlightMatching(soundSet.name, filterText)}{" "}
          <em>
            - {numEntries} {numEntries === 1 ? "entry" : "entries"}
          </em>
          {soundSet.description && (
            <div>{highlightMatching(soundSet.description, filterText)}</div>
          )}
        </div>
        {activeSoundSet ? (
          <>
            <VolumeSlider
              volume={activeSoundSet.volume}
              onChange={(volume) => onSetVolume(activeSoundSet, volume)}
            />
            <Button
              className="music-button"
              onClick={() => onStop(activeSoundSet)}
            >
              stop
            </Button>
          </>
        ) : (
          <>
            <Button className="music-button" onClick={() => onAdd(soundSet)}>
              add
            </Button>
            <Button
              className="music-button"
              onClick={() => onReplace(soundSet)}
            >
              play
            </Button>
          </>
        )}
        <CollapseButton
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          size={20}
        />
      </div>
      {!collapsed && (
        <SoundSetDetails soundSet={soundSet} activeSoundSet={activeSoundSet} />
      )}
    </>
  );
}

function SoundSetDetails({
  soundSet,
  activeSoundSet,
}: {
  soundSet: RRSoundSet;
  activeSoundSet?: RRActiveSoundSet;
}) {
  const dispatch = useServerDispatch();
  const assets = useServerState((state) => state.assets);

  const addPlaylist = () =>
    dispatch(
      soundSetPlaylistAdd(soundSet.id, {
        entries: [],
        volume: 1,
      })
    );

  const [selectSongsForPlaylistId, setSelectSongsForPlaylistId] =
    useState<RRPlaylistID | null>(null);

  const addPlaylistEntry = useCallback(
    (playlistId: RRPlaylistID) => setSelectSongsForPlaylistId(playlistId),
    []
  );

  return (
    <>
      <SongSelectionDialog
        assets={assets}
        open={selectSongsForPlaylistId !== null}
        existingSongIds={
          selectSongsForPlaylistId !== null
            ? soundSet.playlists
                .find((playlist) => playlist.id === selectSongsForPlaylistId)
                ?.entries.map(({ songId }) => songId) ?? []
            : []
        }
        onClose={(selectedSongIds) => {
          if (selectedSongIds !== null && selectSongsForPlaylistId !== null) {
            dispatch(
              [...selectedSongIds].map((selectedSongId) =>
                soundSetPlaylistEntryAdd(
                  soundSet.id,
                  selectSongsForPlaylistId,
                  {
                    songId: selectedSongId,
                    volume: 1,
                  }
                )
              )
            );
          }
          setSelectSongsForPlaylistId(null);
        }}
      />
      {soundSet.playlists.map((playlist, outerIdx) => (
        <Playlist
          key={playlist.id}
          soundSet={soundSet}
          activeSoundSet={activeSoundSet}
          playlist={playlist}
          playlistIdx={outerIdx}
          addPlaylistEntry={addPlaylistEntry}
          assets={assets}
        />
      ))}
      <div className="music-row">
        <span className="ascii-art">└ </span>
        <Button className="music-button no-margin" onClick={addPlaylist}>
          add playlist to sound set
        </Button>
      </div>
    </>
  );
}

function Playlist({
  soundSet,
  activeSoundSet,
  playlist,
  playlistIdx,
  addPlaylistEntry,
  assets,
}: {
  soundSet: RRSoundSet;
  playlist: RRPlaylist;
  playlistIdx: number;
  activeSoundSet?: RRActiveSoundSet;
  addPlaylistEntry: (playlistId: RRPlaylistID) => void;
  assets: SyncedState["assets"];
}) {
  const dispatch = useServerDispatch();
  const confirm = useConfirm();

  const currentlyPlaying = useCurrentlyPlayingPlaylistEntryAndSong(
    playlist,
    activeSoundSet
  );

  return (
    <React.Fragment key={playlist.id}>
      <div className="music-row">
        <div className="music-label">
          <span className="ascii-art">├─┬ </span>
          <em>Playlist #{playlistIdx + 1}</em>
        </div>
        <small>
          {formatDuration(
            playlist.entries
              .map(
                (playlistEntry) =>
                  assets.entities[playlistEntry.songId]?.duration ?? 0
              )
              .reduce((sum, duration) => sum + duration, 0)
          )}
        </small>
        <VolumeSlider
          volume={playlist.volume}
          onChange={(volume) =>
            dispatch({
              actions: [
                soundSetPlaylistUpdate({
                  soundSetId: soundSet.id,
                  update: {
                    id: playlist.id,
                    changes: {
                      volume,
                    },
                  },
                }),
              ],
              optimisticKey: `${soundSet.id}/${playlist.id}/volume`,
              syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
            })
          }
        />
        <Button
          className="music-button"
          onClick={async () => {
            if (
              await confirm(
                "Do you really want to delete this playlist from the sound set (this can not be undone)?"
              )
            )
              dispatch(
                soundSetPlaylistRemove({
                  soundSetId: soundSet.id,
                  playlistId: playlist.id,
                })
              );
          }}
        >
          DEL
        </Button>
      </div>
      {playlist.entries.map(
        ({ id: playlistEntryId, songId, volume }, playlistEntryIdx) => {
          const isCurrent =
            playlistEntryId === currentlyPlaying?.playlistEntry.id;
          const song = assets.entities[songId];

          const trackNum = (playlistEntryIdx + 1).toString().padStart(2, "0");

          return (
            <div key={playlistEntryId} className="music-row">
              <div className="music-label">
                <span className="ascii-art">│ ├ {trackNum} </span>
                {isCurrent && "> "}
                {song ? song.name : <em>song not found</em>}
              </div>
              <Button
                disabled={playlistEntryIdx === 0}
                className="music-button"
                onClick={() => {
                  dispatch(
                    soundSetPlaylistEntryMove({
                      soundSetId: soundSet.id,
                      playlistId: playlist.id,
                      playlistEntryId: playlistEntryId,
                      direction: "up",
                    })
                  );
                }}
              >
                ↑
              </Button>
              <Button
                disabled={playlistEntryIdx === playlist.entries.length - 1}
                className="music-button"
                onClick={() => {
                  dispatch(
                    soundSetPlaylistEntryMove({
                      soundSetId: soundSet.id,
                      playlistId: playlist.id,
                      playlistEntryId: playlistEntryId,
                      direction: "down",
                    })
                  );
                }}
              >
                ↓
              </Button>
              {song && (
                <small>
                  {formatDuration(
                    isCurrent ? currentlyPlaying.timeRemaining : song.duration
                  )}
                </small>
              )}
              <VolumeSlider
                volume={volume}
                onChange={(volume) =>
                  dispatch({
                    actions: [
                      soundSetPlaylistEntryUpdate({
                        soundSetId: soundSet.id,
                        playlistId: playlist.id,
                        update: {
                          id: playlistEntryId,
                          changes: {
                            volume,
                          },
                        },
                      }),
                    ],
                    optimisticKey: `${soundSet.id}/${playlist.id}/${playlistEntryId}/volume`,
                    syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
                  })
                }
              />
              <Button
                className="music-button"
                onClick={async () => {
                  if (
                    await confirm(
                      "Do you really want to delete this song from the playlist (this can not be undone)?"
                    )
                  )
                    dispatch(
                      soundSetPlaylistEntryRemove({
                        soundSetId: soundSet.id,
                        playlistId: playlist.id,
                        playlistEntryId: playlistEntryId,
                      })
                    );
                }}
              >
                DEL
              </Button>
            </div>
          );
        }
      )}
      <div className="music-row">
        <span className="ascii-art">│ └ </span>
        <Button
          className="music-button no-margin"
          onClick={() => addPlaylistEntry(playlist.id)}
        >
          add songs to playlist
        </Button>
      </div>
    </React.Fragment>
  );
}

function SongSelectionDialog({
  assets: assetCollection,
  open,
  existingSongIds,
  onClose,
}: {
  assets: SyncedState["assets"];
  open: boolean;
  existingSongIds: RRAssetID[];
  onClose: (selectedSongs: Set<RRAssetID> | null) => void;
}) {
  const [filter, setFilter] = useState("");

  const assets = matchSorter(entries(assetCollection), filter, {
    keys: ["name", "description", "tags.*"],
    threshold: matchSorter.rankings.ACRONYM,
  });

  const [selectedSongIds, setSelectedSongIds] = useState(
    () => new Set<RRAssetID>()
  );

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFilter("");
    setSelectedSongIds(new Set());

    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={() => onClose(null)}>
      <DialogTitle>Select songs to add</DialogTitle>
      <DialogContent>
        <SmartTextInput
          type="search"
          value={filter}
          placeholder="Search for songs..."
          onChange={(filter) => setFilter(filter)}
          ref={inputRef}
        />
        <p>Songs that already are part of the playlist are not shown.</p>
        <ul role="list" className="music-playlist-song-select-list">
          {assets
            .filter((song) => !existingSongIds.includes(song.id))
            .map((song) => (
              <li key={song.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedSongIds.has(song.id)}
                    onChange={(e) =>
                      setSelectedSongIds((selectedSongIds) => {
                        selectedSongIds = new Set(selectedSongIds);
                        if (e.target.checked) {
                          selectedSongIds.add(song.id);
                        } else {
                          selectedSongIds.delete(song.id);
                        }
                        return selectedSongIds;
                      })
                    }
                  />
                  <span>
                    <span className="music-playlist-song-label">
                      <span>{highlightMatching(song.name, filter)}</span>
                      {formatDuration(song.duration)}
                    </span>
                    {filter.length > 0 && (
                      <small>
                        {song.description &&
                          highlightMatching(song.description, filter)}
                        {song.description && song.tags.length > 0 && <br />}
                        {highlightMatching(
                          song.tags.map((tag) => `#${tag}`).join(" "),
                          filter
                        )}
                      </small>
                    )}
                  </span>
                </label>
              </li>
            ))}
        </ul>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(null)}>cancel</Button>
        <Button onClick={() => onClose(selectedSongIds)}>
          add selected songs to playlist
        </Button>
      </DialogActions>
    </Dialog>
  );
}
