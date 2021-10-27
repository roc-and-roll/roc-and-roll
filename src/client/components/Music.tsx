import {
  faPlay,
  faPlus,
  faSpinner,
  faStar,
  faStop,
} from "@fortawesome/free-solid-svg-icons";
import { faStar as faStarRegular } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { matchSorter } from "match-sorter";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  assetSongAdd,
  ephemeralMusicAdd,
  ephemeralMusicRemove,
  ephemeralMusicUpdate,
  playerUpdateAddFavoritedAssetId,
  playerUpdateRemoveFavoritedAssetId,
  soundSetAdd,
} from "../../shared/actions";
import {
  DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
  DEFAULT_VOLUME,
} from "../../shared/constants";
import {
  entries,
  RRActiveSong,
  RRActiveSongOrSoundSet,
  RRAssetSong,
  RRSoundSet,
} from "../../shared/state";
import { isTabletopAudioAsset } from "../../shared/tabletopaudio";
import { partition, rrid, timestamp } from "../../shared/util";
import { useFileUpload } from "../files";
import { useMyProps } from "../myself";
import { useAlert, usePrompt } from "../dialog-boxes";
import { useServerDispatch, useServerState } from "../state";
import { formatDuration, highlightMatching } from "../util";
import { ActiveSoundSet, SoundSets as SoundSets } from "./SoundSets";
import { Button } from "./ui/Button";
import { TextInput } from "./ui/TextInput";
import { VolumeSlider } from "./VolumeSlider";
import { Collapsible, CollapsibleWithButton } from "./Collapsible";

export type MusicActions = {
  onAdd: (songOrSoundSet: RRAssetSong | RRSoundSet) => void;
  onReplace: (songOrSoundSet: RRAssetSong | RRSoundSet) => void;
  onStop: (activeSongOrSoundSet: RRActiveSongOrSoundSet) => void;
  onFavorite: (song: RRAssetSong) => void;
  onSetVolume: (
    activeSongOrSoundSet: RRActiveSongOrSoundSet,
    volume: number
  ) => void;
};

export const Music = React.memo(function Music() {
  const myself = useMyProps("favoritedAssetIds", "id");
  const dispatch = useServerDispatch();
  const activeMusic = entries(
    useServerState((state) => state.ephemeral.activeMusic)
  );

  const [filter, setFilter] = useState("");

  const assets = useServerState((state) => state.assets);
  const allSongs = entries(assets).flatMap((a) => (a.type === "song" ? a : []));

  const [tabletopaudioSongs, ownSongs] = partition(allSongs, (song) =>
    isTabletopAudioAsset(song)
  );

  const onStop = useCallback(
    (s: RRActiveSongOrSoundSet) => {
      dispatch(ephemeralMusicRemove(s.id));
    },
    [dispatch]
  );

  const onFavorite = useCallback(
    (song: RRAssetSong) => {
      dispatch({
        actions: [
          (myself.favoritedAssetIds.includes(song.id)
            ? playerUpdateRemoveFavoritedAssetId
            : playerUpdateAddFavoritedAssetId)({
            id: myself.id,
            assetId: song.id,
          }),
        ],
        optimisticKey: `favourite/${myself.id}/${song.id}`,
        syncToServerThrottle: 0,
      });
    },
    [dispatch, myself.id, myself.favoritedAssetIds]
  );

  const onReplace = useCallback(
    (songOrSoundSet: RRAssetSong | RRSoundSet) => {
      dispatch((state) => [
        ...entries(state.ephemeral.activeMusic).map((activeSong) =>
          ephemeralMusicRemove(activeSong.id)
        ),
        ephemeralMusicAdd({
          ...("playlists" in songOrSoundSet
            ? { type: "soundSet", soundSetId: songOrSoundSet.id }
            : { type: "song", songId: songOrSoundSet.id }),
          startedAt: timestamp(),
          id: rrid<RRActiveSongOrSoundSet>(),
          volume: DEFAULT_VOLUME,
          addedBy: myself.id,
        }),
      ]);
    },
    [dispatch, myself.id]
  );

  const onAdd = useCallback(
    (songOrSoundSet: RRAssetSong | RRSoundSet) => {
      dispatch(
        ephemeralMusicAdd({
          ...("playlists" in songOrSoundSet
            ? { type: "soundSet", soundSetId: songOrSoundSet.id }
            : { type: "song", songId: songOrSoundSet.id }),
          startedAt: timestamp(),
          id: rrid<RRActiveSongOrSoundSet>(),
          volume: DEFAULT_VOLUME,
          addedBy: myself.id,
        })
      );
    },
    [dispatch, myself.id]
  );

  const onSetVolume = useCallback(
    (t: RRActiveSongOrSoundSet, volume: number) =>
      dispatch({
        actions: [ephemeralMusicUpdate({ id: t.id, changes: { volume } })],
        optimisticKey: `volume/${t.id}`,
        syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
      }),
    [dispatch]
  );

  const actions = useMemo(
    () => ({
      onAdd,
      onReplace,
      onStop,
      onFavorite,
      onSetVolume,
    }),
    [onAdd, onFavorite, onReplace, onSetVolume, onStop]
  );

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

  const showSongList = (songs: RRAssetSong[]) =>
    matchSorter(songs, filter, {
      keys: ["name", "description", "tags.*"],
      threshold: matchSorter.rankings.ACRONYM,
    }).map((song) => {
      const activeSong = activeMusic.find(
        (activeSongOrSoundSet) =>
          activeSongOrSoundSet.type === "song" &&
          song.id === activeSongOrSoundSet.songId
      );
      return (
        <Song
          key={song.id}
          active={activeSong?.type === "song" ? activeSong : undefined}
          audio={song}
          filterText={filter}
          actions={actions}
          isFavorite={myself.favoritedAssetIds.includes(song.id)}
        />
      );
    });

  return (
    <>
      <TextInput
        type="search"
        value={filter}
        onChange={(filter) => setFilter(filter)}
        placeholder="search music..."
      />
      <UploadAudio onUploaded={() => setFilter("")} />
      {activeMusic.length > 0 && (
        <Collapsible title="Playing">
          {activeMusic.map((activeSongOrSoundSet) => {
            if (activeSongOrSoundSet.type === "soundSet") {
              return (
                <ActiveSoundSet
                  key={activeSongOrSoundSet.id}
                  activeSoundSet={activeSongOrSoundSet}
                  actions={actions}
                />
              );
            }
            return (
              <ActiveSong
                key={activeSongOrSoundSet.id}
                activeSong={activeSongOrSoundSet}
                actions={actions}
              />
            );
          })}
        </Collapsible>
      )}
      <Collapsible title="Favourites" defaultCollapsed={true}>
        {showSongList(
          myself.favoritedAssetIds.flatMap((id) => {
            const asset = assets.entities[id];
            return asset?.type === "song" ? asset : [];
          })
        )}
      </Collapsible>
      <CollapsibleWithButton
        title="Sound Sets"
        defaultCollapsed={true}
        buttonIcon={faPlus}
        buttonOnClick={() => createSoundSet()}
      >
        <SoundSets
          filterText={filter}
          actions={actions}
          activeMusic={activeMusic}
        />
      </CollapsibleWithButton>
      <Collapsible title="Uploaded Audio" defaultCollapsed={true}>
        {showSongList(ownSongs)}{" "}
      </Collapsible>
      <Collapsible title="Tabletop Audio" defaultCollapsed={true}>
        {showSongList(tabletopaudioSongs)}
      </Collapsible>
    </>
  );
});

function UploadAudio({ onUploaded }: { onUploaded: () => void }) {
  const [isUploading, upload] = useFileUpload();
  const dispatch = useServerDispatch();
  const myself = useMyProps("id");
  const alert = useAlert();

  const doUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    try {
      const uploadedFiles = await upload(files, "audio");
      if (uploadedFiles.length > 0) {
        dispatch(
          uploadedFiles.map((f) =>
            assetSongAdd({
              name: f.originalFilename,
              description: null,
              location: {
                type: "local",
                filename: f.filename,
                originalFilename: f.originalFilename,
                mimeType: f.mimeType,
              },
              type: "song",
              playerId: myself.id,
              tags: [],
              duration: f.duration,
              extra: {},
            })
          )
        );
        onUploaded();
      }
    } catch (err) {
      await alert(String(err));
    } finally {
      e.target.value = "";
    }
  };

  return (
    <>
      <input type="file" multiple onChange={doUpload} disabled={isUploading} />
      {isUploading && (
        <span>
          <FontAwesomeIcon icon={faSpinner} spin /> uploading...
        </span>
      )}
    </>
  );
}

const ActiveSong = React.memo(function ActiveSong({
  activeSong,
  actions,
}: {
  activeSong: RRActiveSong;
  actions: MusicActions;
}) {
  const asset = useServerState(
    (state) => state.assets.entities[activeSong.songId]
  );

  return asset?.type === "song" ? (
    <Song
      audio={asset}
      active={activeSong}
      filterText=""
      actions={actions}
      inPlayingRow={true}
    />
  ) : null;
});

const Song = React.memo(function Song({
  audio,
  active,
  filterText,
  actions: { onAdd, onReplace, onStop, onFavorite, onSetVolume },
  isFavorite,
  inPlayingRow = false,
}: {
  audio: RRAssetSong;
  active?: RRActiveSong;
  filterText: string;
  actions: MusicActions;
  isFavorite?: boolean;
  inPlayingRow?: boolean;
}) {
  const showTagsAndDescription = filterText.length > 0;

  const calculateTimeRemaining = useCallback(
    () =>
      active
        ? audio.duration - ((Date.now() - active.startedAt) % audio.duration)
        : 0,
    [active, audio.duration]
  );

  const [timeRemaining, setTimeRemaining] = useState(() =>
    calculateTimeRemaining()
  );

  useEffect(() => {
    if (active) {
      setTimeRemaining(calculateTimeRemaining());
      const id = setInterval(() => {
        setTimeRemaining(calculateTimeRemaining());
      }, 1000);

      return () => clearInterval(id);
    }
  }, [active, calculateTimeRemaining]);

  return (
    <div className="music-row">
      <div className="music-label">
        <div className="music-title">
          {highlightMatching(audio.name, filterText)}
        </div>
        {showTagsAndDescription && audio.description && (
          <div className="music-description">
            {highlightMatching(audio.description, filterText)}
          </div>
        )}
        {showTagsAndDescription && (
          <div className="music-tags">
            {highlightMatching(audio.tags.join(". "), filterText)}
          </div>
        )}
      </div>
      <small>{formatDuration(active ? timeRemaining : audio.duration)}</small>
      {active ? (
        <>
          {inPlayingRow && (
            <VolumeSlider
              volume={active.volume}
              onChange={(volume) => onSetVolume(active, volume)}
            />
          )}
          <Button className="music-button" onClick={() => onStop(active)}>
            <FontAwesomeIcon icon={faStop} />
          </Button>
        </>
      ) : (
        <>
          <Button className="music-button" onClick={() => onFavorite(audio)}>
            <FontAwesomeIcon icon={isFavorite ? faStar : faStarRegular} />
          </Button>
          <Button className="music-button" onClick={() => onAdd(audio)}>
            <FontAwesomeIcon icon={faPlus} />
          </Button>
          <Button className="music-button" onClick={() => onReplace(audio)}>
            <FontAwesomeIcon icon={faPlay} />
          </Button>
        </>
      )}
    </div>
  );
});
