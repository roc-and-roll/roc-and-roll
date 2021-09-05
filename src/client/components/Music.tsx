import { matchSorter } from "match-sorter";
import React, { useCallback, useEffect, useState } from "react";
import {
  assetSongAdd,
  ephemeralSongAdd,
  ephemeralSongRemove,
  ephemeralSongUpdate,
  playerUpdateAddFavoritedAssetId,
  playerUpdateRemoveFavoritedAssetId,
} from "../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../shared/constants";
import {
  entries,
  RRActiveSong,
  RRAsset,
  RRAssetID,
  RRSong,
} from "../../shared/state";
import { rrid, timestamp } from "../../shared/util";
import { useFileUpload } from "../files";
import { useMyself } from "../myself";
import { useServerDispatch, useServerState } from "../state";
import { TextInput } from "./ui/TextInput";
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
  const activeSongs = entries(
    useServerState((state) => state.ephemeral.activeSongs)
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

  const onStop = useCallback(
    (s: RRActiveSong) => {
      dispatch(ephemeralSongRemove(s.id));
    },
    [dispatch]
  );

  // FIXME: can be a race condition if the user clicks the button quickly
  const onFavorite = useCallback(
    (s: RRSong) => {
      if (myself.favoritedAssetIds.includes(s.id)) {
        dispatch({
          actions: [
            playerUpdateRemoveFavoritedAssetId({
              id: myself.id,
              assetId: s.id,
            }),
          ],
          optimisticKey: `favourite/${myself.id}/${s.id}`,
          syncToServerThrottle: 0,
        });
      } else {
        dispatch({
          actions: [
            playerUpdateAddFavoritedAssetId({ id: myself.id, assetId: s.id }),
          ],
          optimisticKey: `favourite/${myself.id}/${s.id}`,
          syncToServerThrottle: 0,
        });
      }
    },
    [dispatch, myself.id, myself.favoritedAssetIds]
  );

  const onReplace = useCallback(
    (t: RRSong) => {
      dispatch((state) => [
        ...entries(state.ephemeral.activeSongs).map((activeSong) =>
          ephemeralSongRemove(activeSong.id)
        ),
        ephemeralSongAdd({
          startedAt: timestamp(),
          id: rrid<RRActiveSong>(),
          song: t,
          volume: volumeLinear2Log(DEFAULT_VOLUME),
          addedBy: myself.id,
        }),
      ]);
    },
    [dispatch, myself.id]
  );

  const onAdd = useCallback(
    (t: RRSong) => {
      dispatch(
        ephemeralSongAdd({
          startedAt: timestamp(),
          id: rrid<RRActiveSong>(),
          song: t,
          volume: volumeLinear2Log(DEFAULT_VOLUME),
          addedBy: myself.id,
        })
      );
    },
    [dispatch, myself.id]
  );

  const onSetVolume = useCallback(
    (t: RRActiveSong, volume: number) =>
      dispatch({
        actions: [ephemeralSongUpdate({ id: t.id, changes: { volume } })],
        optimisticKey: `volume/${t.id}/${t.song.id}`,
        syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
      }),
    [dispatch]
  );

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
        onAdd={onAdd}
        onReplace={onReplace}
        onStop={onStop}
        onFavorite={onFavorite}
        onSetVolume={onSetVolume}
      />
    ));

  const allSongs = [...ownSongs, ...(tabletopAudio ?? [])];

  return (
    <>
      <TextInput
        type="search"
        value={filter}
        onChange={(filter) => setFilter(filter)}
        placeholder="search music..."
      />
      <UploadAudio onUploaded={() => setFilter("")} />
      {error}
      <div>
        <strong>- Playing -</strong>
        {activeSongs.map((activeSong) => (
          <Song
            filterText={""}
            key={activeSong.id}
            active={activeSong}
            audio={activeSong.song}
            onAdd={onAdd}
            onReplace={onReplace}
            onStop={onStop}
            onFavorite={onFavorite}
            onSetVolume={onSetVolume}
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
    </>
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

const Song = React.memo(function Song({
  audio,
  active,
  onAdd,
  onReplace,
  onStop,
  onFavorite,
  onSetVolume,
  filterText,
}: {
  audio: RRSong;
  active?: RRActiveSong;
  filterText: string;
  onAdd: (audio: RRSong) => void;
  onReplace: (audio: RRSong) => void;
  onStop: (audio: RRActiveSong) => void;
  onFavorite: (audio: RRSong) => void;
  onSetVolume: (audio: RRActiveSong, volume: number) => void;
}) {
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
            volume={active.volume}
            onChange={(volume) => onSetVolume(active, volume)}
          />
          <div className="tabletopaudio-button" onClick={() => onStop(active)}>
            STOP
          </div>
        </>
      ) : (
        <>
          <div
            className="tabletopaudio-button"
            onClick={() => onFavorite(audio)}
          >
            FAV
          </div>
          <div className="tabletopaudio-button" onClick={() => onAdd(audio)}>
            ADD
          </div>
          <div
            className="tabletopaudio-button"
            onClick={() => onReplace(audio)}
          >
            PLAY
          </div>
        </>
      )}
    </div>
  );
});
