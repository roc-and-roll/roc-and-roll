import { faBug } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useContext } from "react";
import * as z from "zod";

const isDebugSettings = z.strictObject({
  mapDebugOverlayActive: z.boolean(),
  noHUD: z.boolean(),
});
type DebugSettings = z.infer<typeof isDebugSettings>;

const DEFAULT_DEBUG_SETTINGS: DebugSettings = {
  mapDebugOverlayActive: false,
  noHUD: false,
};

export const DebugSettingsContext = React.createContext<
  [DebugSettings, React.Dispatch<React.SetStateAction<DebugSettings>>]
>([
  DEFAULT_DEBUG_SETTINGS,
  () => {
    throw new Error("DebugSettingsContext not initialized");
  },
]);

export function DebugSettingsContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = React.useState<DebugSettings>(
    DEFAULT_DEBUG_SETTINGS
  );

  return (
    <DebugSettingsContext.Provider value={[state, setState]}>
      {children}
    </DebugSettingsContext.Provider>
  );
}

export function DebugSettings() {
  const [settings, setSettings] = useContext(DebugSettingsContext);

  return (
    <>
      <div className="flex items-center mb-2">
        <h1 className="flex-1 text-xl">Debug Settings</h1>
        <FontAwesomeIcon icon={faBug} />
      </div>
      <div className="px-2 py-1 border-2 border-red-800">
        <h2>Map Settings</h2>
        <label>
          <input
            type="checkbox"
            checked={settings.mapDebugOverlayActive}
            onChange={(e) =>
              setSettings((settings) => ({
                ...settings,
                mapDebugOverlayActive: e.target.checked,
              }))
            }
          />{" "}
          show debug map overlay
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.noHUD}
            onChange={(e) =>
              setSettings((settings) => ({
                ...settings,
                noHUD: e.target.checked,
              }))
            }
          />{" "}
          remove map HUD
        </label>
      </div>
    </>
  );
}

export function useDebugSettings() {
  return useContext(DebugSettingsContext)[0];
}
