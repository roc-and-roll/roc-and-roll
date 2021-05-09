import React, { useEffect, useState } from "react";
import {
  assetSongAdd,
  ephermalSongAdd,
  ephermalSongRemove,
} from "../../shared/actions";
import { entries, RRActiveSong, RRAsset, RRSong } from "../../shared/state";
import { rrid } from "../../shared/util";
import { useFileUpload } from "../files";
import { useMyself } from "../myself";
import { useServerDispatch, useServerState } from "../state";
import { apiHost } from "../util";

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

export function Music() {
  const [tabletopAudio, setTabletopAudio] = useState<RRSong[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const myself = useMyself();
  const dispatch = useServerDispatch();
  const activeSongs = useServerState((state) =>
    entries(state.ephermal.activeSongs)
  );

  useEffect(() => {
    fetch(`${apiHost()}/tabletopaudio`)
      .then((res) => res.json())
      .then((l: TabletopAudioResponse) =>
        setTabletopAudio(
          l.tracks.map((t) => ({
            id: rrid<RRAsset>(),
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

  const ownSongs = entries(useServerState((state) => state.assets)).filter(
    (a) => a.type === "song"
  ) as RRSong[];

  const onStop = (s: RRActiveSong) => {
    dispatch(ephermalSongRemove(s.id));
  };

  const onReplace = (t: RRSong) => {
    for (const song of activeSongs) {
      onStop(song);
    }
    onStart(t);
  };

  const onStart = (t: RRSong) => {
    dispatch(
      ephermalSongAdd({
        startedAt: +new Date(),
        id: rrid<RRActiveSong>(),
        song: t,
        volume: 1,
      })
    );
  };

  const showSongList = (songs: RRSong[]) =>
    songs
      .filter(
        (t) =>
          t.name.toLowerCase().includes(filter.toLowerCase()) ||
          t.tags.some((tag) =>
            tag.toLocaleLowerCase().includes(filter.toLocaleLowerCase())
          )
      )
      .map((t) => (
        <Song
          key={t.id}
          active={activeSongs.find((s) => t.id === s.song.id)}
          audio={t}
          filterText={filter}
          onAdd={() => onStart(t)}
          onReplace={() => onReplace(t)}
          onStop={onStop}
        />
      ));

  return (
    <div>
      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="search music..."
      />
      <UploadAudio />
      {error}
      <div>
        <strong>- Playing -</strong>
        {tabletopAudio &&
          activeSongs.map((s) => (
            <Song
              filterText={""}
              key={s.id}
              active={s}
              audio={s.song}
              onAdd={() => onStart(s.song)}
              onReplace={() => onReplace(s.song)}
              onStop={() => onStop(s)}
            />
          ))}
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
}

function UploadAudio() {
  const [isUploading, upload] = useFileUpload();
  const dispatch = useServerDispatch();
  const myself = useMyself();

  const doUpload = async (files: FileList | null) => {
    const uploadedFiles = await upload(files);
    if (uploadedFiles) {
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
  filterText,
}: {
  audio: RRSong;
  active?: RRActiveSong;
  filterText: string;
  onAdd: () => void;
  onReplace: () => void;
  onStop: (a: RRActiveSong) => void;
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
        <div className="tabletopaudio-button" onClick={() => onStop(active)}>
          STOP
        </div>
      ) : (
        <>
          <div className="tabletopaudio-button" onClick={onAdd}>
            ADD
          </div>
          <div className="tabletopaudio-button" onClick={onReplace}>
            REPLACE
          </div>
        </>
      )}
    </div>
  );
}
