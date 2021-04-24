import type { Howl } from "howler";
import React, { useCallback, useContext, useEffect, useRef } from "react";
import useLocalState from "./useLocalState";

export const SoundContext = React.createContext<{
  volume: number;
  setVolume: React.Dispatch<React.SetStateAction<number>>;
}>({
  volume: 1,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setVolume: () => {},
});

SoundContext.displayName = "SoundContext";

export function SoundProvider(props: {
  children: React.ReactNode;
  stateKey: string;
}) {
  const [volume, setVolume] = useLocalState(props.stateKey, 1);
  return (
    <SoundContext.Provider
      value={{
        volume,
        setVolume,
      }}
    >
      {props.children}
    </SoundContext.Provider>
  );
}

/**
 * Returns a function to play a sound. Might skip playing the sound if howler is
 * not yet loaded.
 *
 * Does not stop playing the sound when the component unmounts.
 */
export function useRRSimpleSound(url: string) {
  const howlConstructorRef = useRef<typeof Howl | null>(null);
  const howlRef = useRef<Howl | null>(null);

  const globalVolume = useContext(SoundContext).volume;
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
