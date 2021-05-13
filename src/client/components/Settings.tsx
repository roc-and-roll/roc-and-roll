import React from "react";
import { globalSettingsUpdate } from "../../shared/actions";
import { clamp } from "../../shared/util";
import { useMyself } from "../myself";
import { RRSettings, useRRSettings } from "../settings";
import { useServerDispatch, useServerState } from "../state";
import { GMArea } from "./GMArea";
import { Select } from "./ui/Select";

// from https://www.dr-lex.be/info-stuff/volumecontrols.html#table1
const LOUDNESS_A = 3.1623e-3;
const LOUDNESS_B = 5.757;

export function Settings() {
  const [settings, setSettings] = useRRSettings();
  const myself = useMyself();
  const musicIsGMOnly = useServerState(
    (state) => state.globalSettings.musicIsGMOnly
  );
  const dispatch = useServerDispatch();

  const linearVolume =
    settings.volume === 0
      ? 0
      : Math.log(settings.volume / LOUDNESS_A) / LOUDNESS_B;

  return (
    <>
      <p>
        Volume{" "}
        <input
          type="range"
          value={linearVolume}
          min={0}
          step={0.01}
          max={1}
          onChange={(e) => {
            const logarithmicVolume =
              e.target.valueAsNumber === 0
                ? 0
                : clamp(
                    0,
                    LOUDNESS_A * Math.exp(LOUDNESS_B * e.target.valueAsNumber),
                    1
                  );
            setSettings((old) => ({
              ...old,
              volume: logarithmicVolume,
            }));
          }}
        />
        {Math.round(linearVolume * 100)}%
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
              checked={musicIsGMOnly}
              onChange={(e) =>
                dispatch(
                  globalSettingsUpdate({ musicIsGMOnly: e.target.checked })
                )
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
