import type { Howl } from "howler";
import { useCallback, useEffect, useRef } from "react";
import { useRRSettings } from "./settings";

/**
 * Returns a function to play a sound. Might skip playing the sound if howler is
 * not yet loaded.
 *
 * Does not stop playing the sound when the component unmounts.
 */
export function useRRSimpleSound(url: string) {
  const howlConstructorRef = useRef<typeof Howl | null>(null);
  const howlRef = useRef<Howl | null>(null);

  const globalVolume = useRRSettings()[0].volume;
  const globalMute = globalVolume <= 0;

  useEffect(() => {
    void import("howler").then((m) => {
      howlConstructorRef.current = m.Howl;
    });
  }, []);

  const play = useCallback(() => {
    if (howlConstructorRef.current) {
      if (!howlRef.current) {
        howlRef.current = new howlConstructorRef.current({
          src: [url],
        });
      }
      howlRef.current.volume(globalVolume);
      howlRef.current.mute(globalMute);
      howlRef.current.play();
    }
  }, [globalMute, globalVolume, url]);

  return play;
}
