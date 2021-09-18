import React from "react";
import { clamp } from "../../shared/util";

export function VolumeSlider({
  volume,
  onChange,
}: {
  volume: number;
  onChange: (volume: number) => void;
}) {
  return (
    <>
      <input
        type="range"
        value={volume}
        min={0}
        step={0.01}
        max={1}
        onChange={(e) => onChange(e.target.valueAsNumber)}
      />
      <span className="ascii-art">
        {Math.round(100 * volume)
          .toString()
          .padStart(3, " ")}
        %
      </span>
    </>
  );
}

// from https://www.dr-lex.be/info-stuff/volumecontrols.html#table1
const LOUDNESS_A = 3.1623e-3;
const LOUDNESS_B = 5.757;

export function volumeLog2linear(volume: number) {
  return volume === 0 ? 0 : Math.log(volume / LOUDNESS_A) / LOUDNESS_B;
}

export function volumeLinear2Log(volume: number) {
  return volume === 0
    ? 0
    : clamp(0, LOUDNESS_A * Math.exp(LOUDNESS_B * volume), 1);
}
