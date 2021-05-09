import React, { useEffect, useState } from "react";
import { ephermalSongAdd, ephermalSongRemove } from "../../shared/actions";
import { entries, RRActiveSong } from "../../shared/state";
import { rrid, withDo } from "../../shared/util";
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
  const [list, setList] = useState<TabletopAudioResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dispatch = useServerDispatch();
  const activeSongs = useServerState((state) =>
    entries(state.ephermal.activeSongs)
  );

  useEffect(() => {
    fetch(`${apiHost()}/tabletopaudio`)
      .then((res) => res.json())
      .then(setList)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      .catch((err) => setError(err.toString()));
  }, []);

  const [filter, setFilter] = useState("");

  const songDo = <T extends any>(
    track: TabletopAudio,
    cb: (s: RRActiveSong) => T
  ) =>
    withDo(
      activeSongs.find((t) => t.url === track.link),
      (t) => t && cb(t)
    );
  const tabletopAudioDo = <T extends any>(
    song: RRActiveSong,
    cb: (s: TabletopAudio) => T
  ) =>
    withDo(
      list?.tracks.find((t) => t.link === song.url),
      (t) => t && cb(t)
    );

  const onStop = (t: TabletopAudio) => {
    songDo(t, (s) => dispatch(ephermalSongRemove(s.id)));
  };

  const onReplace = (t: TabletopAudio) => {
    for (const song of activeSongs) {
      tabletopAudioDo(song, onStop);
    }
    onStart(t);
  };

  const onStart = (t: TabletopAudio) => {
    dispatch(
      ephermalSongAdd({
        startedAt: +new Date(),
        id: rrid<RRActiveSong>(),
        url: t.link,
        volume: 1,
      })
    );
  };

  return (
    <div>
      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="search music..."
      />
      {error}
      <div>
        - Playing -
        {list &&
          activeSongs.map((s) =>
            withDo(
              list.tracks.find((t) => t.link === s.url),
              (t) =>
                t && (
                  <Song
                    filterText={""}
                    key={t.link}
                    active={true}
                    audio={t}
                    onAdd={() => onStart(t)}
                    onReplace={() => onReplace(t)}
                    onStop={() => onStop(t)}
                  />
                )
            )
          )}
      </div>
      <div>
        - All -
        {list?.tracks
          .filter(
            (t) =>
              t.track_title.toLowerCase().includes(filter.toLowerCase()) ||
              t.tags.some((tag) =>
                tag.toLocaleLowerCase().includes(filter.toLocaleLowerCase())
              )
          )
          .map((t) => (
            <Song
              key={t.key}
              active={activeSongs.some((s) => s.url === t.link)}
              audio={t}
              filterText={filter}
              onAdd={() => onStart(t)}
              onReplace={() => onReplace(t)}
              onStop={() => onStop(t)}
            />
          ))}
      </div>
    </div>
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
  audio: TabletopAudio;
  active: boolean;
  filterText: string;
  onAdd: () => void;
  onReplace: () => void;
  onStop: () => void;
}) {
  const showTags = filterText.length > 0;

  return (
    <div className="tabletopaudio-song">
      <div className="tabletopaudio-label">
        {highlightMatching(audio.track_title, filterText)}
        <div className="tabletopaudio-tags">
          {showTags && highlightMatching(audio.tags.join(". "), filterText)}
        </div>
      </div>
      {active ? (
        <div className="tabletopaudio-button" onClick={onStop}>
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
