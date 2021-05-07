import React, { useEffect, useState } from "react";
import { useRRComplexSound } from "../sound";
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
  const [activeSong, setActiveSong] = useState<TabletopAudio | null>(null);

  useEffect(() => {
    fetch(`${apiHost()}/tabletopaudio`)
      .then((res) => res.json())
      .then(setList)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      .catch((err) => setError(err.toString()));
  }, []);

  const [filter, setFilter] = useState("");

  return (
    <div>
      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="search music..."
      />
      {error}
      {list?.tracks
        .filter((t) =>
          t.track_title.toLowerCase().includes(filter.toLowerCase())
        )
        .map((t) => (
          <Song
            key={t.key}
            active={activeSong === t}
            audio={t}
            onStart={() =>
              setActiveSong((currentSong) => (currentSong === t ? null : t))
            }
          />
        ))}
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
  const [play, pause, state] = useRRComplexSound(audio.link, true);
  useEffect(() => {
    if (active) {
      play();
    } else {
      pause();
    }
  }, [active, pause, play]);

  return (
    <div onClick={onStart}>
      {audio.track_title} ({state})
    </div>
  );
}
