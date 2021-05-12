import React from "react";
import { useMyself } from "../myself";
import { RRSettings, useRRSettings } from "../settings";
import { GMArea } from "./GMArea";
import { Select } from "./ui/Select";

export function Settings() {
  const [settings, setSettings] = useRRSettings();
  const myself = useMyself();

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
      <label>
        Mute{" "}
        <input
          type="checkbox"
          checked={settings.mute}
          onChange={(e) =>
            setSettings((old) => ({ ...old, mute: e.target.checked }))
          }
        />
      </label>
      <div>
        <label>
          fast render mode{" "}
          <Select<RRSettings["renderMode"]>
            value={settings.renderMode}
            options={[
              { label: "fancy", value: "fancy" },
              { label: "mostly fancy", value: "mostly-fancy" },
              { label: "fast", value: "fast" },
            ]}
            onChange={(value) =>
              setSettings((old) => ({
                ...old,
                renderMode: value,
              }))
            }
          />
        </label>
      </div>
      {myself.isGM && (
        <GMArea>
          <label>
            Music is GM-only{" "}
            <input
              type="checkbox"
              checked={settings.musicIsGMOnly}
              onChange={(e) =>
                setSettings((old) => ({
                  ...old,
                  musicIsGMOnly: e.target.checked,
                }))
              }
            />
          </label>
        </GMArea>
      )}
      {process.env.NODE_ENV === "development" && (
        <>
          <h4>debug settings</h4>
          <div>
            <label>
              show debug map overlay{" "}
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
        </>
      )}
    </>
  );
}
