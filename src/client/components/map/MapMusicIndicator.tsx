import { faCircle, faVolumeMute } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import React, { useEffect, useState } from "react";
import tinycolor from "tinycolor2";
import { byId, entries, RRColor } from "../../../shared/state";
import { useRRSettings } from "../../settings";
import { useServerState } from "../../state";
import { contrastColor } from "../../util";

export const MapMusicIndicator = React.memo<{ mapBackgroundColor: RRColor }>(
  function MapMusicIndicator({ mapBackgroundColor }) {
    const [{ mute: isMuted }, setSettings] = useRRSettings();
    const [isTimeouted, setIsTimeouted] = useState(false);

    const players = useServerState((state) => state.players.entities);
    const activeSongs = useServerState((state) => state.ephemeral.activeSongs);

    const activeSongTitles = entries(activeSongs)
      .map(
        (activeSong) =>
          `${activeSong.song.name} [${
            byId(players, activeSong.addedBy)?.name ?? "Unknown Player"
          }]`
      )
      .join(", ");

    useEffect(() => {
      if (activeSongTitles.length === 0) {
        return;
      }

      setIsTimeouted(false);

      const id = setTimeout(() => setIsTimeouted(true), 10000);
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
        className="map-music-indicator"
        style={{ backgroundColor, color: textColor }}
        title={title}
        role="button"
        aria-label={isMuted ? "Unmute music" : "Mute music"}
        onClick={() =>
          setSettings((settings) => ({ ...settings, mute: !settings.mute }))
        }
      >
        {isMuted ? (
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
            "is-timeouted": isTimeouted,
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
