import { matchSorter } from "match-sorter";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
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
import { useServerDispatch, useServerState } from "../state";
import { formatDuration, highlightMatching } from "../util";
import { CollapseButton } from "./CollapseButton";
import { Dialog, DialogActions, DialogContent, DialogTitle } from "./Dialog";
import { MusicActions } from "./Music";
import { Button } from "./ui/Button";
import { SmartTextInput } from "./ui/TextInput";
import { VolumeSlider } from "./VolumeSlider";
import { useCurrentlyPlayingPlaylistEntryAndSong } from "../sound";
import { useConfirm, usePrompt } from "../dialog-boxes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlay,
  faPlus,
  faStop,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";

export const SoundSets = React.memo<{
  filterText: string;
  actions: MusicActions;
  activeMusic: RRActiveSongOrSoundSet[];
}>(function SoundSets({ filterText, actions, activeMusic }) {
  const soundSets = useServerState((state) => state.soundSets);

  const filteredSoundSets = matchSorter(entries(soundSets), filterText, {
    keys: ["name", "description"],
    threshold: matchSorter.rankings.ACRONYM,
  });

  if (filteredSoundSets.length === 0) {
    return (
      <>
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
          <CollapseButton
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            size={20}
            side="left"
          />
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
              <FontAwesomeIcon icon={faStop} />
            </Button>
          </>
        ) : (
          <>
            <Button className="music-button" onClick={() => onAdd(soundSet)}>
              <FontAwesomeIcon icon={faPlus} />
            </Button>
            <Button
              className="music-button"
              onClick={() => onReplace(soundSet)}
            >
              <FontAwesomeIcon icon={faPlay} />
            </Button>
          </>
        )}
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
  const prompt = usePrompt();

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
    async (playlistId: RRPlaylistID, type: "silence" | "song") => {
      if (type === "song") {
        setSelectSongsForPlaylistId(playlistId);
      } else {
        const durationText = (
          await prompt("Enter the duration of the silence in seconds.")
        )?.trim();
        if (durationText === undefined || durationText.length === 0) {
          return;
        }
        const duration = parseInt(durationText) * 1000;
        if (isNaN(duration)) {
          return;
        }

        dispatch(
          soundSetPlaylistEntryAdd(soundSet.id, playlistId, {
            type: "silence",
            duration,
          })
        );
      }
    },
    [dispatch, prompt, soundSet.id]
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
                ?.entries.flatMap((playlistEntry) =>
                  playlistEntry.type === "song" ? playlistEntry.songId : []
                ) ?? []
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
                    type: "song",
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
        <Button className="music-button no-margin-left" onClick={addPlaylist}>
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
  addPlaylistEntry: (
    playlistId: RRPlaylistID,
    type: "silence" | "song"
  ) => void;
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
              .map((playlistEntry) => {
                if (playlistEntry.type === "silence") {
                  return playlistEntry.duration;
                }
                const asset = assets.entities[playlistEntry.songId];
                return asset?.type === "song" ? asset.duration : 0;
              })
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
          <FontAwesomeIcon icon={faTimes} />
        </Button>
      </div>
      {playlist.entries.map((playlistEntry, playlistEntryIdx) => {
        const isCurrent =
          playlistEntry.id === currentlyPlaying?.playlistEntry.id;
        const asset =
          playlistEntry.type === "song"
            ? assets.entities[playlistEntry.songId]
            : undefined;
        const song = asset?.type === "song" ? asset : undefined;

        const duration =
          song?.duration ??
          (playlistEntry.type === "silence" && playlistEntry.duration);

        const trackNum = (playlistEntryIdx + 1).toString().padStart(2, "0");

        return (
          <div key={playlistEntry.id} className="music-row">
            <div className="music-label">
              <div className="music-title" title={song?.name}>
                <span className="ascii-art">│ ├ {trackNum} </span>
                {isCurrent && "> "}

                {playlistEntry.type === "song" ? (
                  song ? (
                    song.name
                  ) : (
                    <em>song not found</em>
                  )
                ) : (
                  <em>~ silence ~</em>
                )}
              </div>
            </div>
            <Button
              disabled={playlistEntryIdx === 0}
              className="music-button"
              onClick={() => {
                dispatch(
                  soundSetPlaylistEntryMove({
                    soundSetId: soundSet.id,
                    playlistId: playlist.id,
                    playlistEntryId: playlistEntry.id,
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
                    playlistEntryId: playlistEntry.id,
                    direction: "down",
                  })
                );
              }}
            >
              ↓
            </Button>
            {typeof duration === "number" && (
              <small>
                {formatDuration(
                  isCurrent ? currentlyPlaying.timeRemaining : duration
                )}
              </small>
            )}
            {playlistEntry.type === "song" ? (
              <VolumeSlider
                volume={playlistEntry.volume}
                onChange={(volume) =>
                  dispatch({
                    actions: [
                      soundSetPlaylistEntryUpdate({
                        soundSetId: soundSet.id,
                        playlistId: playlist.id,
                        update: {
                          id: playlistEntry.id,
                          changes: {
                            volume,
                          },
                        },
                      }),
                    ],
                    optimisticKey: `${soundSet.id}/${playlist.id}/${playlistEntry.id}/volume`,
                    syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
                  })
                }
              />
            ) : (
              <>
                <span className="range-placeholder" />
                <span className="ascii-art">{"    "}</span>
              </>
            )}
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
                      playlistEntryId: playlistEntry.id,
                    })
                  );
              }}
            >
              <FontAwesomeIcon icon={faTimes} />
            </Button>
          </div>
        );
      })}
      <div className="music-row">
        <span className="ascii-art">│ └ </span>
        <Button
          className="music-button no-margin-left"
          onClick={() => addPlaylistEntry(playlist.id, "song")}
        >
          add songs to playlist
        </Button>
        |
        <Button
          className="music-button"
          onClick={() => addPlaylistEntry(playlist.id, "silence")}
        >
          add silence to playlist
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

  const filteredSongs = assets.flatMap((asset) =>
    asset.type === "song" && !existingSongIds.includes(asset.id) ? asset : []
  );

  const selectAll = () => {
    setSelectedSongIds(
      (selectedSongIds) =>
        new Set([...selectedSongIds, ...filteredSongs.map((song) => song.id)])
    );
  };

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
          <li>
            <label>
              <input type="checkbox" checked={false} onClick={selectAll} />{" "}
              <em>select all</em>
            </label>
          </li>
          {filteredSongs.map((song) => (
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
