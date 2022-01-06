import React, { useLayoutEffect, useMemo } from "react";
import { useContext } from "react";
import { ReadonlyDeep } from "type-fest";
import useLocalState from "./useLocalState";

// increase this whenever the Settings type changes
const CURRENT_SETTINGS_VERSION = 6;

export type RRSettings = ReadonlyDeep<{
  version: number;
  volume: number;
  mute: boolean;
  renderMode: "fast" | "mostly-fancy" | "fancy";
  enableExperimental25D: boolean;
  collapseDiceTemplates: boolean;
  focusTokenOnTurnStart: boolean;
}>;

const initialSettings: RRSettings = {
  version: CURRENT_SETTINGS_VERSION,
  volume: 1,
  mute: false,
  renderMode: "fancy",
  enableExperimental25D: false,
  collapseDiceTemplates: false,
  focusTokenOnTurnStart: false,
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

  const value = useMemo(
    () => [settings, setSettings] as const,
    [settings, setSettings]
  );

  return (
    <RRSettingsContext.Provider value={value}>
      {props.children}
    </RRSettingsContext.Provider>
  );
}
