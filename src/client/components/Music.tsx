import { matchSorter } from "match-sorter";
import React, { useEffect, useState } from "react";
import {
  assetSongAdd,
  ephemeralSongAdd,
  ephemeralSongRemove,
  ephemeralSongUpdate,
  playerUpdateAddFavoritedAssetId,
  playerUpdateRemoveFavoritedAssetId,
} from "../../shared/actions";
import {
  byId,
  entries,
  RRActiveSong,
  RRAsset,
  RRAssetID,
  RRSong,
} from "../../shared/state";
import { rrid, timestamp } from "../../shared/util";
import { useFileUpload } from "../files";
import { useMyself } from "../myself";
import {
  useOptimisticDebouncedServerUpdate,
  useServerDispatch,
  useServerState,
} from "../state";
import { volumeLinear2Log, VolumeSlider } from "./VolumeSlider";

interface TabletopAudio {
  key: number;
  track_title: string;
  track_type: string;
  track_genre: string[];
  flavor: string;
  small_image: string;
  large_image: string;
  link: string;
  new: boolean;
  tags: string[];
}

interface TabletopAudioResponse {
  tracks: TabletopAudio[];
}

const DEFAULT_VOLUME = 0.5;

export const Music = React.memo(function Music() {
  const [tabletopAudio, setTabletopAudio] = useState<RRSong[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const myself = useMyself();
  const dispatch = useServerDispatch();
  const activeSongs = useServerState((state) =>
    entries(state.ephemeral.activeSongs)
  );

  useEffect(() => {
    fetch(`/api/tabletopaudio`)
      .then((res) => res.json() as Promise<TabletopAudioResponse>)
      .then((l) =>
        setTabletopAudio(
          l.tracks.map((t) => ({
            // use a stable ID such that favoriting external tracks works
            id: t.link as RRAssetID,
            type: "song",
            name: t.track_title,
            durationSeconds: 0,
            tags: t.tags,
            external: true,
            filenameOrUrl: t.link,
            playerId: myself.id,
          }))
        )
      )
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      .catch((err) => setError(err.toString()));
  }, [myself.id]);

  const [filter, setFilter] = useState("");

  const ownSongs = entries(useServerState((state) => state.assets)).flatMap(
    (a) => (a.type === "song" ? a : [])
  );

  const onStop = (s: RRActiveSong) => {
    dispatch(ephemeralSongRemove(s.id));
  };

  // FIXME: can be a race condition if the user clicks the button quickly
  const onFavorite = (s: RRSong) => {
    if (myself.favoritedAssetIds.includes(s.id)) {
      dispatch(
        playerUpdateRemoveFavoritedAssetId({ id: myself.id, assetId: s.id })
      );
    } else {
      dispatch(
        playerUpdateAddFavoritedAssetId({ id: myself.id, assetId: s.id })
      );
    }
  };

  const onReplace = (t: RRSong) => {
    dispatch([
      ...activeSongs.map((activeSong) => ephemeralSongRemove(activeSong.id)),
      ephemeralSongAdd({
        startedAt: timestamp(),
        id: rrid<RRActiveSong>(),
        song: t,
        volume: volumeLinear2Log(DEFAULT_VOLUME),
        addedBy: myself.id,
      }),
    ]);
  };

  const onStart = (t: RRSong) => {
    dispatch(
      ephemeralSongAdd({
        startedAt: timestamp(),
        id: rrid<RRActiveSong>(),
        song: t,
        volume: volumeLinear2Log(DEFAULT_VOLUME),
        addedBy: myself.id,
      })
    );
  };

  const showSongList = (songs: RRSong[]) =>
    matchSorter(songs, filter, {
      keys: ["name", "tags.*"],
      threshold: matchSorter.rankings.ACRONYM,
    }).map((t) => (
      <Song
        key={t.id}
        active={activeSongs.find((s) => t.id === s.song.id)}
        audio={t}
        filterText={filter}
        onAdd={() => onStart(t)}
        onReplace={() => onReplace(t)}
        onStop={onStop}
        onFavorite={() => onFavorite(t)}
      />
    ));

  const allSongs = [...ownSongs, ...(tabletopAudio ?? [])];

  return (
    <div>
      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="search music..."
      />
      <UploadAudio onUploaded={() => setFilter("")} />
      {error}
      <div>
        <strong>- Playing -</strong>
        {tabletopAudio &&
          activeSongs.map((activeSong) => (
            <Song
              filterText={""}
              key={activeSong.id}
              active={activeSong}
              audio={activeSong.song}
              onAdd={() => onStart(activeSong.song)}
              onReplace={() => onReplace(activeSong.song)}
              onStop={() => onStop(activeSong)}
              onFavorite={() => onFavorite(activeSong.song)}
            />
          ))}
      </div>
      <div>
        <strong>- Favorites -</strong>
        {showSongList(
          myself.favoritedAssetIds.flatMap(
            (id) => allSongs.find((song) => song.id === id) ?? []
          )
        )}
      </div>
      <div>
        <strong>- Own Audio -</strong>
        {showSongList(ownSongs)}
      </div>
      <div>
        <strong>- Tabletop Audio -</strong>
        {tabletopAudio && showSongList(tabletopAudio)}
      </div>
    </div>
  );
});

function UploadAudio({ onUploaded }: { onUploaded: () => void }) {
  const [isUploading, upload] = useFileUpload();
  const dispatch = useServerDispatch();
  const myself = useMyself();

  const doUpload = async (files: FileList | null) => {
    const uploadedFiles = await upload(files);
    if (uploadedFiles.length > 0) {
      dispatch(
        uploadedFiles.map((f) =>
          assetSongAdd({
            id: rrid<RRAsset>(),
            name: f.originalFilename,
            filenameOrUrl: f.filename,
            external: false,
            type: "song",
            playerId: myself.id,
            tags: [],
            durationSeconds: 0,
          })
        )
      );
      onUploaded();
    }
  };

  return (
    <input
      type="file"
      multiple
      onChange={(e) => doUpload(e.target.files)}
      disabled={isUploading}
    />
  );
}

const highlightMatching = (text: string, search: string) => {
  if (search.length < 1) {
    return text;
  }

  const index = text.toLowerCase().indexOf(search.toLowerCase());
  if (index >= 0) {
    return (
      <>
        {text.substring(0, index)}
        <strong className="search-match">
          {text.substring(index, index + search.length)}
        </strong>
        {text.substring(index + search.length)}
      </>
    );
  }

  return text;
};

function Song({
  audio,
  active,
  onAdd,
  onReplace,
  onStop,
  onFavorite,
  filterText,
}: {
  audio: RRSong;
  active?: RRActiveSong;
  filterText: string;
  onAdd: () => void;
  onReplace: () => void;
  onStop: (a: RRActiveSong) => void;
  onFavorite: () => void;
}) {
  const [volume, setVolume] = useOptimisticDebouncedServerUpdate(
    (state) =>
      active
        ? byId(state.ephemeral.activeSongs.entities, active.id)?.volume
        : 0,
    (volume) =>
      active
        ? ephemeralSongUpdate({ id: active.id, changes: { volume: volume } })
        : undefined,
    1000
  );
  const showTags = filterText.length > 0;

  return (
    <div className="tabletopaudio-song">
      <div className="tabletopaudio-label">
        {highlightMatching(audio.name, filterText)}
        <div className="tabletopaudio-tags">
          {showTags && highlightMatching(audio.tags.join(". "), filterText)}
        </div>
      </div>
      {active ? (
        <>
          <VolumeSlider
            volume={volume ?? 0}
            onChange={(volume) => {
              setVolume(volume);
            }}
          />
          <div className="tabletopaudio-button" onClick={() => onStop(active)}>
            STOP
          </div>
        </>
      ) : (
        <>
          <div className="tabletopaudio-button" onClick={onFavorite}>
            FAV
          </div>
          <div className="tabletopaudio-button" onClick={onAdd}>
            ADD
          </div>
          <div className="tabletopaudio-button" onClick={onReplace}>
            PLAY
          </div>
        </>
      )}
    </div>
  );
}
