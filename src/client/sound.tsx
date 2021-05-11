import React, { useMemo } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { entries, RRActiveSong } from "../shared/state";
import { useRRSettings } from "./settings";
import { useLatest, useServerState } from "./state";
import { Howl } from "howler";
import { assetUrl } from "./files";
import { atom, useRecoilValue, useSetRecoilState } from "recoil";
import { nanoid } from "@reduxjs/toolkit";

const lockedSoundsAtom = atom<string[]>({
  key: "lockedSounds",
  default: [],
});

const updateLockedSounds = (key: string, needsUnlock: boolean) => (
  keys: string[]
): string[] => {
  if (needsUnlock) {
    if (keys.includes(key)) {
      return keys;
    }
    return [...keys, key];
  } else {
    if (keys.includes(key)) {
      return keys.filter((each) => each !== key);
    } else {
      return keys;
    }
  }
};

/**
 * Returns a function to play a sound. Might skip playing the sound if howler is
 * not yet loaded.
 *
 * Does not stop playing the sound when the component unmounts.
 */
export function useRRSimpleSound(url: string): [() => void, () => void] {
  const howlRef = useRef<Howl | null>(null);

  const [{ volume: globalVolume, mute: globalMute }] = useRRSettings();
  const globalVolumeRef = useLatest(globalVolume);
  const globalMuteRef = useLatest(globalMute);

  const play = useCallback(() => {
    if (!howlRef.current) {
      howlRef.current = new Howl({
        src: url,
        // We need to initialize mute and volume both here and in the effect
        // below, because howlRef.current is null when the effect is executed
        // before calling play for the first time.
        mute: globalMuteRef.current,
        volume: globalVolumeRef.current,
      });
    }
    howlRef.current.play();
  }, [globalMuteRef, globalVolumeRef, url]);

  useEffect(() => {
    howlRef.current?.volume(globalVolume);
    howlRef.current?.mute(globalMute);
  }, [globalVolume, globalMute]);

  const pause = useCallback(() => {
    if (howlRef.current) howlRef.current.pause();
  }, []);

  return [play, pause];
}

type SoundState =
  | "loading"
  | "playing"
  | "stopped"
  | "paused"
  | "error"
  | "error-needs-unlock";

export function useRRComplexSound(
  url: string,
  // if true, the sound does not need to be downloaded in its entirety before it
  // starts playing
  stream: boolean,
  loop: boolean = false
): readonly [(startInSeconds?: number) => void, () => void, SoundState] {
  const urlRef = useLatest(url);
  const loopRef = useLatest(loop);

  const howlRef = useRef<Howl | null>(null);

  const [{ volume: globalVolume, mute: globalMute }] = useRRSettings();
  const globalVolumeRef = useLatest(globalVolume);
  const globalMuteRef = useLatest(globalMute);

  useEffect(() => {
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

  const play = useCallback(
    (startedAt?: number) => {
      if (lastUrlRef.current !== urlRef.current) {
        howlRef.current?.unload();
        howlRef.current = null;
      }
      lastUrlRef.current = urlRef.current;

      if (!howlRef.current) {
        setState("loading");
        howlRef.current = new Howl({
          src: urlRef.current,
          html5: stream,
          // We need to initialize loop, mute, and volume both here and in the
          // effect below, because howlRef.current is null when the effect is
          // executed before calling play for the first time.
          loop: loopRef.current,
          mute: globalMuteRef.current,
          volume: globalVolumeRef.current,
          onplay: () => setState("playing"),
          onpause: () => setState("paused"),
          onstop: () => setState("stopped"),
          onend: () => setState("stopped"),
          onloaderror: () => setState("error"),
          onplayerror: () => {
            // https://github.com/goldfire/howler.js/#mobilechrome-playback
            setState("error-needs-unlock");
            howlRef.current?.once("unlock", () => {
              howlRef.current?.play();
              if (startedAt !== undefined) {
                howlRef.current?.seek((Date.now() - startedAt) / 1000);
              }
            });
          },
        });
      }
      if (startedAt !== undefined) {
        howlRef.current.seek((Date.now() - startedAt) / 1000);
      }
      howlRef.current.play();
    },
    [globalMuteRef, globalVolumeRef, loopRef, stream, urlRef]
  );

  useEffect(() => {
    howlRef.current?.volume(globalVolume);
    howlRef.current?.mute(globalMute);
    howlRef.current?.loop(loop);
  }, [globalMute, globalVolume, loop]);

  const pause = useCallback(() => {
    howlRef.current?.pause();
  }, []);

  const setLockedSounds = useSetRecoilState(lockedSoundsAtom);
  const id = useMemo(() => nanoid(), []);
  useEffect(() => {
    setLockedSounds(updateLockedSounds(id, state === "error-needs-unlock"));
    return () => setLockedSounds(updateLockedSounds(id, false));
  }, [state, setLockedSounds, id]);

  return [play, pause, state] as const;
}

export function SongPlayer() {
  const songs = useServerState((state) => entries(state.ephermal.activeSongs));
  // We can't usually autoplay audio, so prompt the user to confirm it.
  // It may not be sufficient to prompt the user just once, when many additional
  // sounds are played at once.
  const needsUnlock = useRecoilValue(lockedSoundsAtom);

  return (
    <>
      {needsUnlock.length > 0 && (
        <div className="join-audio-popup">Click to join the music</div>
      )}
      {songs.map((s) => {
        return <ActiveSongPlayer key={assetUrl(s.song)} song={s} />;
      })}
    </>
  );
}

export function ActiveSongPlayer({ song }: { song: RRActiveSong }) {
  const [play] = useRRComplexSound(assetUrl(song.song), true, true);

  useEffect(() => {
    play(song.startedAt);
  }, [play, song.startedAt]);

  return null;
}
