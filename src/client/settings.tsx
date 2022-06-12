import React, { useLayoutEffect, useMemo } from "react";
import { useContext } from "react";
import { ReadonlyDeep } from "type-fest";
import useLocalState from "./useLocalState";

// increase this whenever the Settings type changes
const CURRENT_SETTINGS_VERSION = 7;

export type RRSettings = ReadonlyDeep<{
  version: number;
  volume: number;
  mute: boolean;
  notificationSound: "all" | "messages-only" | "none";
  renderMode: "fast" | "mostly-fancy" | "fancy";
  collapseDiceTemplates: boolean;
  focusTokenOnTurnStart: boolean;
  logNames: "verbose" | "playerName" | "characterName";
}>;

const initialSettings: RRSettings = {
  version: CURRENT_SETTINGS_VERSION,
  volume: 1,
  mute: false,
  notificationSound: "messages-only",
  renderMode: "fancy",
  collapseDiceTemplates: false,
  focusTokenOnTurnStart: false,
  logNames: "characterName",
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
