import React from "react";
import { globalSettingsUpdate } from "../../shared/actions";
import { useMyProps } from "../myself";
import { RRSettings, useRRSettings } from "../settings";
import { useServerDispatch, useServerState } from "../state";
import { GMArea } from "./GMArea";
import { Select } from "./ui/Select";
import { VolumeSlider } from "./VolumeSlider";

export function Settings() {
  const [settings, setSettings] = useRRSettings();
  const myself = useMyProps("isGM");
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
        Notification Sound{" "}
        <Select<RRSettings["notificationSound"]>
          value={settings.notificationSound}
          options={[
            { label: "all", value: "all" },
            { label: "messages only", value: "messages-only" },
            { label: "none", value: "none" },
          ]}
          onChange={(value) =>
            setSettings((old) => ({
              ...old,
              notificationSound: value,
            }))
          }
        />
      </label>
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
      <label>
        Enable Experimental Isometric Rendering{" "}
        <input
          type="checkbox"
          checked={settings.enableExperimental25D}
          onChange={(e) =>
            setSettings((old) => ({
              ...old,
              enableExperimental25D: e.target.checked,
            }))
          }
        />
      </label>
      {myself.isGM && (
        <GMArea>
          <label>
            Only the GM can control music{" "}
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
      <label>
        Collapse Dice Template
        <input
          type="checkbox"
          checked={settings.collapseDiceTemplates}
          onChange={(e) =>
            setSettings((old) => ({
              ...old,
              collapseDiceTemplates: e.target.checked,
            }))
          }
        />
      </label>
      <label>
        Focus Token on Turn Start
        <input
          type="checkbox"
          checked={settings.focusTokenOnTurnStart}
          onChange={(e) =>
            setSettings((old) => ({
              ...old,
              focusTokenOnTurnStart: e.target.checked,
            }))
          }
        />
      </label>
      <div>
        <label>
          Log Entry Titles for Dice Rolls
          <Select<RRSettings["logNames"]>
            value={settings.logNames}
            options={[
              { label: "character name only", value: "characterName" },
              { label: "player name only", value: "playerName" },
              { label: "player and character name", value: "verbose" },
            ]}
            onChange={(value) =>
              setSettings((old) => ({
                ...old,
                logNames: value,
              }))
            }
          />
        </label>
      </div>
    </>
  );
}
