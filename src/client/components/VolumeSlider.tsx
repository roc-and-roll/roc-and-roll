import React from "react";
import { clamp } from "../../shared/util";

// from https://www.dr-lex.be/info-stuff/volumecontrols.html#table1
const LOUDNESS_A = 3.1623e-3;
const LOUDNESS_B = 5.757;

export function VolumeSlider({
  volume,
  onChange,
}: {
  volume: number;
  onChange: (volume: number) => any;
}) {
  const linearVolume =
    volume === 0 ? 0 : Math.log(volume / LOUDNESS_A) / LOUDNESS_B;

  return (
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
        onChange(logarithmicVolume);
      }}
    />
  );
}
