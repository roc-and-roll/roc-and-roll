import React from "react";
import { useSettings } from "../settings";

export function Settings() {
  const [settings, setSettings] = useSettings();

  return (
    <>
      <p>
        Volume{" "}
        <input
          type="range"
          value={settings.volume}
          min={0}
          step={0.01}
          max={1}
          onChange={(e) =>
            setSettings((old) => ({ ...old, volume: e.target.valueAsNumber }))
          }
        />
        {settings.volume}
      </p>
      {process.env.NODE_ENV === "development" && (
        <>
          <h4>debug settings</h4>
          <div>
            <label>
              show map token position overlay{" "}
              <input
                type="checkbox"
                checked={settings.debug.mapTokenPositions}
                onChange={(e) =>
                  setSettings((old) => ({
                    ...old,
                    debug: {
                      ...old.debug,
                      mapTokenPositions: e.target.checked,
                    },
                  }))
                }
              />
            </label>
          </div>
          <div>
            <label>
              show 3d dice playground{" "}
              <input
                type="checkbox"
                checked={settings.debug.dice3d}
                onChange={(e) =>
                  setSettings((old) => ({
                    ...old,
                    debug: { ...old.debug, dice3d: e.target.checked },
                  }))
                }
              />
            </label>
          </div>
        </>
      )}
    </>
  );
}
