import React, { useMemo } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { entries, RRActiveSong } from "../shared/state";
import { useRRSettings } from "./settings";
import { useLatest, useServerState } from "./state";
import { Howl } from "howler";
import { assetUrl } from "./files";
import { atom, useRecoilValue, useSetRecoilState } from "recoil";
import { nanoid } from "@reduxjs/toolkit";
import { volumeLinear2Log, volumeLog2linear } from "./components/VolumeSlider";

const lockedSoundsAtom = atom<string[]>({
  key: "lockedSounds",
  default: [],
});

const updateLockedSounds =
  (key: string, needsUnlock: boolean) =>
  (keys: string[]): string[] => {
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
  soundVolume: number,
  {
    stream: html5,
    loop,
  }: {
    // if true, the sound does not need to be downloaded in its entirety before it
    // starts playing
    stream: boolean;
    loop: boolean;
  }
): readonly [(startedAt: number) => void, () => void, () => void, SoundState] {
  const urlRef = useLatest(url);
  const loopRef = useLatest(loop);

  const howlRef = useRef<Howl | null>(null);

  const [{ volume: globalUserVolume, mute: globalUserMute }] = useRRSettings();
  const volume = volumeLinear2Log(
    volumeLog2linear(globalUserVolume) * volumeLog2linear(soundVolume)
  );
  const volumeRef = useLatest(volume);
  const globalUserMuteRef = useLatest(globalUserMute);

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

  const durationRef = useRef<number | undefined>(undefined);
  const soundIdRef = useRef<number | undefined>(undefined);
  const startedAtRef = useRef<number | undefined>(undefined);

  const _play = useCallback(() => {
    if (startedAtRef.current === undefined) {
      // When calling play() multiple times, we do not want to queue additional
      // versions of this sound. Instead, we want to stop playing the
      // potentially already playing sound before calling play() again.
      // Therefore we pass the soundId of the previously played sound to
      // interrupt it and start it again.
      soundIdRef.current = howlRef.current?.play(soundIdRef.current);
    } else {
      if (durationRef.current !== undefined) {
        soundIdRef.current = howlRef.current?.play(soundIdRef.current);
        // At least in Chrome, seeking in a looped sound only works when seeking
        // to an offset <= duration the duration of the song. Therefore, we can
        // only start playing the song at the correct seek position if we know
        // the duration of the song.
        const seekSeconds =
          ((Date.now() - startedAtRef.current) / 1000) % durationRef.current;
        howlRef.current?.seek(seekSeconds, soundIdRef.current);
      }
    }
  }, []);

  const play = useCallback(
    (startedAt?: number) => {
      startedAtRef.current = startedAt;

      // Unload the previous sound if the url changes.
      if (lastUrlRef.current !== urlRef.current) {
        howlRef.current?.unload();
        durationRef.current = undefined;
        soundIdRef.current = undefined;
        howlRef.current = null;
      }
      lastUrlRef.current = urlRef.current;

      if (!howlRef.current) {
        setState("loading");
        howlRef.current = new Howl({
          src: urlRef.current,
          html5,
          autoplay: false,
          preload: true,
          // We need to initialize volume, mute, and loop both here and in the
          // effect below, because howlRef.current is null when the effect is
          // executed before calling play for the first time.
          volume: volumeRef.current,
          mute: globalUserMuteRef.current,
          loop: loopRef.current,
          onplay: () => setState("playing"),
          onpause: () => setState("paused"),
          onstop: () => setState("stopped"),
          onend: () => setState("stopped"),
          onloaderror: () => setState("error"),
          onload: () => {
            durationRef.current = howlRef.current?.duration();
            _play();
          },
          onplayerror: () => {
            // https://github.com/goldfire/howler.js/#mobilechrome-playback
            setState("error-needs-unlock");
          },
          onunlock: () => {
            _play();
          },
        });
      }
      _play();
    },
    [globalUserMuteRef, volumeRef, loopRef, html5, urlRef, _play]
  );

  useEffect(() => {
    howlRef.current?.volume(volume);
    howlRef.current?.mute(globalUserMute);
    howlRef.current?.loop(loop);
  }, [globalUserMute, volume, loop]);

  const pause = useCallback(() => {
    howlRef.current?.pause();
  }, []);

  const stop = useCallback(() => {
    howlRef.current?.stop();
  }, []);

  const setLockedSounds = useSetRecoilState(lockedSoundsAtom);
  const id = useMemo(() => nanoid(), []);
  useEffect(() => {
    setLockedSounds(updateLockedSounds(id, state === "error-needs-unlock"));
    return () => setLockedSounds(updateLockedSounds(id, false));
  }, [state, setLockedSounds, id]);

  return [play, pause, stop, state] as const;
}

export function SongPlayer() {
  const songs = entries(useServerState((state) => state.ephemeral.activeSongs));
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
  const [play] = useRRComplexSound(assetUrl(song.song), song.volume, {
    stream: true,
    loop: true,
  });

  useEffect(() => {
    play(song.startedAt);
  }, [play, song.startedAt]);

  return null;
}
