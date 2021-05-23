import React from "react";
import { globalSettingsUpdate } from "../../shared/actions";
import { useMyself } from "../myself";
import { RRSettings, useRRSettings } from "../settings";
import { useServerDispatch, useServerState } from "../state";
import { GMArea } from "./GMArea";
import { Select } from "./ui/Select";
import { VolumeSlider } from "./VolumeSlider";

export function Settings() {
  const [settings, setSettings] = useRRSettings();
  const myself = useMyself();
  const musicIsGMOnly = useServerState(
    (state) => state.globalSettings.musicIsGMOnly
  );
  const dispatch = useServerDispatch();

  return (
    <>
      <p>
        Volume{" "}
        <VolumeSlider
          volume={settings.volume}
          onChange={(volume) => {
            setSettings((old) => ({ ...old, volume: volume }));
          }}
        />
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
