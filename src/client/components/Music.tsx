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
  track_genre: string;
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

  const onStartAudio = (t: TabletopAudio) => {
    const playing = activeSongs.find((s) => s.url === t.link);
    if (playing) {
      dispatch(ephermalSongRemove(playing.id));
    } else {
      dispatch(
        ephermalSongAdd({
          startedAt: +new Date(),
          id: rrid<RRActiveSong>(),
          url: t.link,
          volume: 1,
        })
      );
    }
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
                    key={t.link}
                    active={true}
                    audio={t}
                    onStart={() => onStartAudio(t)}
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
              onStart={() => onStartAudio(t)}
            />
          ))}
      </div>
    </div>
  );
}

function Song({
  audio,
  active,
  onStart,
}: {
  audio: TabletopAudio;
  active: boolean;
  onStart: () => void;
}) {
  return (
    <div onClick={onStart}>
      {audio.track_title} ({active ? "playing" : "stopped"})
    </div>
  );
}
