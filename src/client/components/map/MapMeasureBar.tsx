import React from "react";
import { GRID_SIZE } from "../../../shared/constants";
import { RRPoint } from "../../../shared/state";
import tinycolor from "tinycolor2";

export function MapMeasureBar({
  from,
  to,
  zoom,
  color,
}: {
  from: RRPoint;
  to: RRPoint;
  zoom: number;
  color: string;
}) {
  const distance =
    (Math.sqrt(Math.pow(from.x - to.x, 2) + Math.pow(from.y - to.y, 2)) /
      GRID_SIZE) *
    5;
  return (
    <>
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        style={{ strokeDasharray: "10", strokeWidth: 5 }}
        stroke={tinycolor(color).setAlpha(0.3).toRgbString()}
      />
      <text x={to.x + GRID_SIZE} y={to.y} fill={color} fontSize={14 / zoom}>
        {distance.toFixed(1) + "ft"}
      </text>
    </>
  );
}
