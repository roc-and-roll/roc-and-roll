import {
  faCircle,
  faSpinner,
  faVolumeMute,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import React, { useEffect, useState } from "react";
import { useRecoilValue } from "recoil";
import tinycolor from "tinycolor2";
import { entries, RRColor } from "../../../shared/state";
import { assertNever } from "../../../shared/util";
import { useRRSettings } from "../../settings";
import { loadingSoundsAtom } from "../../sound";
import { useServerState, useServerStateRef } from "../../state";
import { contrastColor } from "../../util";

export const MapMusicIndicator = React.memo<{ mapBackgroundColor: RRColor }>(
  function MapMusicIndicator({ mapBackgroundColor }) {
    const [{ mute: isMuted }, setSettings] = useRRSettings();
    const isLoadingSounds = useRecoilValue(loadingSoundsAtom).size > 0;

    const serverStateRef = useServerStateRef((state) => state);
    const activeMusic = useServerState((state) => state.ephemeral.activeMusic);
    const [activeSongTitles, setActiveSongTitles] = useState<string>("");
    const [isTimeOuted, setIsTimeOuted] = useState(false);

    useEffect(() => {
      // This is a deliberate optimization (and tradeoff): Instead of
      // subscribing to changes to ephemeral music, players, assets, and sound
      // sets, we only subscribe to changes to ephemeral music, and read the
      // others from a ref. Thus, the text will not update if, i.e., the player
      // name changes.
      const players = serverStateRef.current.players;
      const assets = serverStateRef.current.assets;
      const soundSets = serverStateRef.current.soundSets;

      setActiveSongTitles(
        entries(activeMusic)
          .flatMap((activeSongOrSoundSet) => {
            let name;
            switch (activeSongOrSoundSet.type) {
              case "song": {
                const song = assets.entities[activeSongOrSoundSet.songId];
                if (!song) {
                  return [];
                }
                name = song.name;
                break;
              }
              case "soundSet": {
                const soundSet =
                  soundSets.entities[activeSongOrSoundSet.soundSetId];
                if (!soundSet) {
                  return [];
                }
                name = soundSet.name;
                break;
              }
              default:
                assertNever(activeSongOrSoundSet);
            }

            return `${name} [${
              players.entities[activeSongOrSoundSet.addedBy]?.name ??
              "Unknown Player"
            }]`;
          })
          .join(", ")
      );
    }, [activeMusic]);

    useEffect(() => {
      if (activeSongTitles.length === 0) {
        return;
      }

      setIsTimeOuted(false);

      const id = setTimeout(() => setIsTimeOuted(true), 10000);
      return () => clearTimeout(id);
    }, [activeSongTitles]);

    if (activeSongTitles.length === 0) {
      return null;
    }

    const textColor = contrastColor(mapBackgroundColor);
    const backgroundColor = tinycolor(mapBackgroundColor)
      .setAlpha(0.7)
      .toRgbString();

    const title = `Now playing: ${activeSongTitles}`;

    return (
      <span
        className="map-music-indicator rounded"
        style={{ backgroundColor, color: textColor }}
        title={title}
        role="button"
        aria-label={`${isLoadingSounds ? "Loading music - " : ""}${
          isMuted ? "Unmute music" : "Mute music"
        }`}
        onClick={() =>
          setSettings((settings) => ({ ...settings, mute: !settings.mute }))
        }
      >
        {isLoadingSounds ? (
          <span className="fa-layers fa-fw">
            <FontAwesomeIcon icon={faSpinner} spin transform="grow-10" />
            {isMuted && (
              <>
                <FontAwesomeIcon
                  icon={faCircle}
                  color="#cc0000"
                  transform="grow-4 right-10 down-10"
                  fixedWidth
                />
                <FontAwesomeIcon
                  icon={faVolumeMute}
                  color="white"
                  fixedWidth
                  transform="shrink-4 right-10 down-10"
                />
              </>
            )}
          </span>
        ) : isMuted ? (
          <span className="fa-layers fa-fw">
            <FontAwesomeIcon
              icon={faCircle}
              color="#cc0000"
              transform="grow-12"
              fixedWidth
            />
            <FontAwesomeIcon
              icon={faVolumeMute}
              color="white"
              transform="grow-2"
              fixedWidth
            />
          </span>
        ) : (
          <EqualizerIcon color={textColor} />
        )}
        <span
          className={clsx("song-titles", {
            "is-timeOuted": isTimeOuted,
          })}
        >
          {activeSongTitles}
        </span>
      </span>
    );
  }
);

const EqualizerIcon = React.memo(function Icon({ color }: { color: RRColor }) {
  return (
    <span className="map-music-equalizer-icon">
      <span style={{ background: color }}></span>
      <span style={{ background: color }}></span>
      <span style={{ background: color }}></span>
    </span>
  );
});
