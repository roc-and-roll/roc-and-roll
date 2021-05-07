import React from "react";
import type { Howl } from "howler";
import { useCallback, useEffect, useRef, useState } from "react";
import { entries, RRActiveSong } from "../shared/state";
import { useRRSettings } from "./settings";
import { useLatest, useServerState } from "./state";

let howler: typeof Howl;

/**
 * Returns a function to play a sound. Might skip playing the sound if howler is
 * not yet loaded.
 *
 * Does not stop playing the sound when the component unmounts.
 */
export function useRRSimpleSound(url: string): [() => void, () => void] {
  const howlRef = useRef<Howl | null>(null);

  const [{ volume: globalVolume }] = useRRSettings();
  const globalMute = globalVolume <= 0;

  useEffect(() => {
    void import("howler").then((m) => {
      howler = m.Howl;
    });
  }, []);

  const play = useCallback(() => {
    if (howler) {
      if (!howlRef.current) {
        howlRef.current = new howler({
          src: url,
        });
      }
      howlRef.current.volume(globalVolume);
      howlRef.current.mute(globalMute);
      howlRef.current.play();
    }
  }, [globalMute, globalVolume, url]);

  const pause = useCallback(() => {
    if (howlRef.current) howlRef.current.pause();
  }, []);

  return [play, pause];
}

type SoundState = "loading" | "playing" | "stopped" | "paused" | "error";

export function useRRComplexSound(
  url: string,
  // if true, the sound does not need to be downloaded in its entirety before it
  // starts playing
  streamSound: boolean
): readonly [() => void, () => void, SoundState] {
  const urlRef = useLatest(url);

  const howlRef = useRef<Howl | null>(null);

  const [{ volume: globalVolume }] = useRRSettings();
  const globalMute = globalVolume <= 0;

  useEffect(() => {
    void import("howler").then((m) => {
      howler = m.Howl;
    });

    return () => {
      // turn off the "stop" event handler, which would otherwise call setState,
      // which triggers an error when done during unmounting.
      howlRef.current?.off("stop");
      howlRef.current?.unload();
      howlRef.current = null;
    };
  }, []);

  const [state, setState] = useState<SoundState>("stopped");
  const lastUrlRef = useRef("");

  const play = useCallback(() => {
    if (!howler) {
      return;
    }

    if (lastUrlRef.current !== urlRef.current) {
      howlRef.current?.unload();
      howlRef.current = null;
    }
    lastUrlRef.current = urlRef.current;

    if (!howlRef.current) {
      setState("loading");
      howlRef.current = new howler({
        src: urlRef.current,
        html5: streamSound,
        onplay: () => setState("playing"),
        onpause: () => setState("paused"),
        onstop: () => setState("stopped"),
        onend: () => setState("stopped"),
        onloaderror: () => setState("error"),
        onplayerror: () => setState("error"),
      });
    }
    howlRef.current.volume(globalVolume);
    howlRef.current.mute(globalMute);
    howlRef.current.play();
  }, [globalMute, globalVolume, streamSound, urlRef]);

  const pause = useCallback(() => {
    howlRef.current?.pause();
  }, []);

  return [play, pause, state] as const;
}

export function SongPlayer() {
  const songs = useServerState((state) => entries(state.ephermal.activeSongs));

  return (
    <>
      {songs.map((s) => (
        <ActiveSongPlayer key={s.url} song={s} />
      ))}
    </>
  );
}

export function ActiveSongPlayer({ song }: { song: RRActiveSong }) {
  const [play] = useRRComplexSound(song.url, true);

  useEffect(() => {
    play();
  }, [play]);

  return <></>;
}
