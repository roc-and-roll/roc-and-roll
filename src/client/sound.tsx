import React, { useContext } from "react";
import useSound from "use-sound";
import { HookOptions } from "use-sound/dist/types";
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

export function useRRSound(
  url: string,
  options?: Exclude<HookOptions, "soundEnabled">
) {
  const globalVolume = useContext(SoundContext).volume;
  const globalSoundEnabled = globalVolume > 0;

  console.log(globalVolume);

  return useSound(url, {
    ...options,
    volume: (options?.volume ?? 1) * globalVolume,
    soundEnabled: globalSoundEnabled,
  });
}

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
