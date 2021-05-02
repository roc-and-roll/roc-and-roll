import React, { useLayoutEffect, useMemo } from "react";
import { useContext } from "react";
import { ReadonlyDeep } from "type-fest";
import useLocalState from "./useLocalState";

// increase this whenever the Settings type changes
const CURRENT_SETTINGS_VERSION = 3;

export type RRSettings = ReadonlyDeep<{
  version: number;
  volume: number;
  renderMode: "fast" | "mostly-fancy" | "fancy";
  debug: {
    mapTokenPositions: boolean;
  };
}>;

const initialSettings: RRSettings = {
  version: CURRENT_SETTINGS_VERSION,
  volume: 1,
  renderMode: "fancy",
  debug: {
    mapTokenPositions: false,
  },
};

const RRSettingsContext = React.createContext<
  readonly [RRSettings, React.Dispatch<React.SetStateAction<RRSettings>>]
>([
  initialSettings,
  () => {
    // ignore
  },
]);
RRSettingsContext.displayName = "SettingsContext";

export function useRRSettings() {
  return useContext(RRSettingsContext);
}

export function SettingsProvider(props: { children: React.ReactNode }) {
  const [settings, setSettings, forgetSettings] = useLocalState(
    "settings",
    initialSettings
  );

  useLayoutEffect(() => {
    if (settings.version !== CURRENT_SETTINGS_VERSION) {
      forgetSettings();
    }
  }, [settings, forgetSettings]);

  const value = useMemo(() => [settings, setSettings] as const, [
    settings,
    setSettings,
  ]);

  return (
    <RRSettingsContext.Provider value={value}>
      {props.children}
    </RRSettingsContext.Provider>
  );
}
