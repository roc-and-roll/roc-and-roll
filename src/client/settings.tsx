import React, { useLayoutEffect, useMemo } from "react";
import { useContext } from "react";
import { ReadonlyDeep } from "type-fest";
import useLocalState from "./useLocalState";

// increase this whenever the Settings type changes
const CURRENT_SETTINGS_VERSION = 1;

export type Settings = ReadonlyDeep<{
  version: number;
  volume: number;
  debug: {
    mapTokenPositions: boolean;
    dice3d: boolean;
  };
}>;

const initialSettings = {
  version: CURRENT_SETTINGS_VERSION,
  volume: 1,
  debug: {
    mapTokenPositions: false,
    dice3d: false,
  },
};

const SettingsContext = React.createContext<
  readonly [Settings, React.Dispatch<React.SetStateAction<Settings>>]
>([
  initialSettings,
  () => {
    // ignore
  },
]);
SettingsContext.displayName = "SettingsContext";

export function useSettings() {
  return useContext(SettingsContext);
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
    <SettingsContext.Provider value={value}>
      {props.children}
    </SettingsContext.Provider>
  );
}
