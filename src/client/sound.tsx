import React, { useDebugValue, useMemo } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  entries,
  RRActiveSong,
  RRActiveSongOrSoundSet,
  RRActiveSoundSet,
  RRAssetSong,
  RRPlaylist,
  RRPlaylistEntry,
} from "../shared/state";
import { useRRSettings } from "./settings";
import { useServerState, useServerStateRef } from "./state";
import { useLatest } from "./useLatest";
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
  urlAndDuration: { url: string; duration: number } | null,
  soundVolume: number,
  {
    loop,
  }: {
    loop: boolean;
  }
): readonly [(startedAt: number) => void, () => void, () => void, SoundState] {
  const urlRef = useLatest(urlAndDuration?.url);
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
  const lastUrlRef = useRef<string | undefined>("");

  const durationRef = useLatest(urlAndDuration?.duration);
  const soundIdRef = useRef<number | undefined>(undefined);
  const startedAtRef = useRef<number | undefined>(undefined);

  const _play = useCallback(() => {
    if (!howlRef.current || durationRef.current === undefined) {
      return;
    }

    if (startedAtRef.current === undefined) {
      // When calling play() multiple times, we do not want to queue additional
      // versions of this sound. Instead, we want to stop playing the
      // potentially already playing sound before calling play() again.
      // Therefore we pass the soundId of the previously played sound to
      // interrupt it and start it again.
      soundIdRef.current = howlRef.current.play(soundIdRef.current);
    } else {
      soundIdRef.current = howlRef.current.play(soundIdRef.current);
      // At least in Chrome, seeking in a looped sound only works when seeking
      // to an offset <= the duration of the song. Therefore, we can only
      // start playing the song at the correct seek position if we know
      // the duration of the song.
      const seekSeconds =
        ((Date.now() - startedAtRef.current) % durationRef.current) / 1000;
      howlRef.current.seek(seekSeconds, soundIdRef.current);
    }
  }, [durationRef]);

  const play = useCallback(
    (startedAt?: number) => {
      startedAtRef.current = startedAt;

      // Unload the previous sound if the url changes.
      if (lastUrlRef.current !== urlRef.current) {
        howlRef.current?.unload();
        soundIdRef.current = undefined;
        howlRef.current = null;
      }
      lastUrlRef.current = urlRef.current;

      if (!howlRef.current) {
        setState("loading");
        howlRef.current = new Howl({
          src: urlRef.current,
          html5: false, // never enable html5, Howler is buggy with html5
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
            _play();
          },
          onplayerror: () => {
            console.log("is locked");
            // https://github.com/goldfire/howler.js/#mobilechrome-playback
            setState("error-needs-unlock");
          },
          onunlock: () => {
            _play();
          },
        });
      } else {
        _play();
      }
    },
    [globalUserMuteRef, volumeRef, loopRef, urlRef, _play]
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
    soundIdRef.current = undefined;
    startedAtRef.current = undefined;
  }, []);

  const setLockedSounds = useSetRecoilState(lockedSoundsAtom);
  const id = useMemo(() => nanoid(), []);
  useEffect(() => {
    setLockedSounds(updateLockedSounds(id, state === "error-needs-unlock"));
    return () => setLockedSounds(updateLockedSounds(id, false));
  }, [state, setLockedSounds, id]);

  useDebugValue({
    url: urlAndDuration?.url,
    duration: urlAndDuration?.duration,
    startedAt: startedAtRef.current,
    soundId: soundIdRef.current,
    state,
  });

  return [play, pause, stop, state] as const;
}

export const ActiveMusicPlayer = React.memo(function ActiveSongsPlayer() {
  const activeMusic = entries(
    useServerState((state) => state.ephemeral.activeMusic)
  );
  // We can't usually autoplay audio, so prompt the user to confirm it.
  // It may not be sufficient to prompt the user just once, when many additional
  // sounds are played at once.
  const needsUnlock = useRecoilValue(lockedSoundsAtom);

  return (
    <>
      {needsUnlock.length > 0 && (
        <div className="join-audio-popup">Click to join the music</div>
      )}
      {activeMusic.map((activeSongOrSoundSet) => {
        if (activeSongOrSoundSet.type === "soundSet") {
          return (
            <ActiveSoundSetPlayer
              key={activeSongOrSoundSet.id}
              activeSoundSet={activeSongOrSoundSet}
            />
          );
        }
        return (
          <ActiveSongPlayer
            key={activeSongOrSoundSet.id}
            activeSong={activeSongOrSoundSet}
          />
        );
      })}
    </>
  );
});

function ActiveSongPlayer({ activeSong }: { activeSong: RRActiveSong }) {
  const song = useServerState(
    (state) => state.assets.entities[activeSong.songId]
  );

  return song ? (
    <ActiveSongPlayerImpl activeSong={activeSong} song={song} />
  ) : null;
}

function ActiveSongPlayerImpl({
  activeSong,
  song,
}: {
  activeSong: RRActiveSongOrSoundSet;
  song: RRAssetSong;
}) {
  const [play, _pause, stop] = useRRComplexSound(
    { url: assetUrl(song), duration: song.duration },
    activeSong.volume,
    { loop: false }
  );

  useEffect(() => {
    play(activeSong.startedAt);

    return () => stop();
  }, [play, stop, activeSong.startedAt]);

  return null;
}

function ActiveSoundSetPlayer({
  activeSoundSet,
}: {
  activeSoundSet: RRActiveSoundSet;
}) {
  const soundSet = useServerState(
    (state) => state.soundSets.entities[activeSoundSet.soundSetId]
  );

  return soundSet ? (
    <>
      {soundSet.playlists.map((playlist) => (
        <ActivePlaylistPlayerImpl
          key={playlist.id}
          activeSoundSet={activeSoundSet}
          playlist={playlist}
        />
      ))}
    </>
  ) : null;
}

function ActivePlaylistPlayerImpl({
  activeSoundSet,
  playlist,
}: {
  activeSoundSet: RRActiveSoundSet;
  playlist: RRPlaylist;
}) {
  const current = useCurrentlyPlayingPlaylistEntryAndSong(
    playlist,
    activeSoundSet
  );

  const [play, _pause, stop] = useRRComplexSound(
    current
      ? { url: assetUrl(current.song), duration: current.song.duration }
      : null,
    volumeLog2linear(
      activeSoundSet.volume *
        playlist.volume *
        (current?.playlistEntry.volume ?? 0)
    ),
    { loop: false }
  );

  useEffect(() => {
    if (current?.startedAt === undefined) {
      return;
    }
    play(current.startedAt);
  }, [
    play,
    stop,
    current?.startedAt,
    // Also restart playing if the song changes
    current?.song,
  ]);

  return null;
}

type CurrentlyPlaylingPlaylistEntryAndSongResult = null | {
  song: RRAssetSong;
  startedAt: number;
  timeRemaining: number;
  playlistEntry: RRPlaylistEntry;
};

export function useCurrentlyPlayingPlaylistEntryAndSong(
  playlist: RRPlaylist,
  activeSoundSet?: RRActiveSoundSet
): CurrentlyPlaylingPlaylistEntryAndSongResult {
  const assetsRef = useServerStateRef((state) => state.assets);

  const calculate = useCallback(() => {
    if (activeSoundSet?.startedAt === undefined) {
      return null;
    }

    const assets = assetsRef.current;
    const playlistEntriesWithSongs = playlist.entries.flatMap(
      (playlistEntry) => {
        const song = assets.entities[playlistEntry.songId];
        return song ? { playlistEntry, song } : [];
      }
    );

    const totalPlaylistDuration = playlistEntriesWithSongs.reduce(
      (sum, { song }) => sum + song.duration,
      0
    );

    const playlistTimeOffset =
      (Date.now() - activeSoundSet.startedAt) % totalPlaylistDuration;

    let currentSongStartedAt: number | null = null;
    let currentSongTimeRemaining: number | null = null;
    let currentPlaylistEntryWithSong: {
      song: RRAssetSong;
      playlistEntry: RRPlaylistEntry;
    } | null = null;
    let time = 0;
    for (const entry of playlistEntriesWithSongs) {
      if (playlistTimeOffset <= time + entry.song.duration) {
        currentPlaylistEntryWithSong = entry;
        currentSongTimeRemaining =
          entry.song.duration - (playlistTimeOffset - time);
        currentSongStartedAt = Date.now() - (playlistTimeOffset - time);
        break;
      }

      time += entry.song.duration;
    }

    return currentPlaylistEntryWithSong === null ||
      currentSongStartedAt === null ||
      currentSongTimeRemaining === null
      ? null
      : {
          ...currentPlaylistEntryWithSong,
          startedAt: currentSongStartedAt,
          timeRemaining: currentSongTimeRemaining,
        };
  }, [activeSoundSet?.startedAt, assetsRef, playlist.entries]);

  const [current, setCurrent] =
    useState<CurrentlyPlaylingPlaylistEntryAndSongResult>(() => calculate());

  useEffect(() => setCurrent(calculate()), [calculate]);

  useEffect(() => {
    const intervalId = setInterval(() => setCurrent(calculate()), 1000);

    return () => clearInterval(intervalId);
  }, [calculate]);

  return current;
}
