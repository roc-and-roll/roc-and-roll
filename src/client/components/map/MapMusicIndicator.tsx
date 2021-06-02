import clsx from "clsx";
import React, { useEffect, useState } from "react";
import tinycolor from "tinycolor2";
import { entries, RRColor } from "../../../shared/state";
import { useServerState } from "../../state";
import { contrastColor } from "../../util";

export const MapMusicIndicator = React.memo<{ mapBackgroundColor: RRColor }>(
  function MapMusicIndicator({ mapBackgroundColor }) {
    const [isTimeouted, setIsTimeouted] = useState(false);

    const activeSongTitles = entries(
      useServerState((state) => state.ephermal.activeSongs)
    )
      .map((activeSong) => activeSong.song.name)
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

    return (
      <span
        className={clsx("map-music-indicator", {
          "is-timeouted": isTimeouted,
        })}
        style={{ backgroundColor, color: textColor, borderColor: textColor }}
        title={`Now playing: ${activeSongTitles}`}
      >
        <Icon color={textColor} /> {activeSongTitles}
      </span>
    );
  }
);

const Icon = React.memo(function Icon({ color }: { color: RRColor }) {
  return (
    <span className="map-music-icon">
      <span style={{ background: color }}></span>
      <span style={{ background: color }}></span>
      <span style={{ background: color }}></span>
    </span>
  );
});
