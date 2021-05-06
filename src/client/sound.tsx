import type { Howl } from "howler";
import { useCallback, useEffect, useRef } from "react";
import { useRRSettings } from "./settings";

let howler: typeof Howl;

/**
 * Returns a function to play a sound. Might skip playing the sound if howler is
 * not yet loaded.
 *
 * Does not stop playing the sound when the component unmounts.
 */
export function useRRSimpleSound(url: string): [() => void, () => void] {
  const howlRef = useRef<Howl | null>(null);

  const globalVolume = useRRSettings()[0].volume;
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
          src: [url],
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
