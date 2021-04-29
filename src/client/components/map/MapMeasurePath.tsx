import React, { useMemo } from "react";
import tinycolor from "tinycolor2";
import { GRID_SIZE } from "../../../shared/constants";
import { RRPoint } from "../../../shared/state";
import { makePoint, pointAdd, pointScale, pointSubtract } from "../../point";
import { RoughLine, RoughText } from "../rough";

const overlappingPairsSum = <T extends any>(
  a: T[],
  f: (a: T, b: T) => number
) => {
  let sum = 0;
  for (let i = 0; i < a.length - 1; i++) {
    sum += f(a[i]!, a[i + 1]!);
  }
  return sum;
};
const overlappingPairsMap = <T extends any, U extends any>(
  a: T[],
  f: (a: T, b: T, i?: number) => U
) => {
  const res: U[] = [];
  for (let i = 0; i < a.length - 1; i++) {
    res.push(f(a[i]!, a[i + 1]!, i));
  }
  return res;
};

const dotSize = 10;

const centered = (p: RRPoint) =>
  pointScale(pointAdd(p, makePoint(0.5)), GRID_SIZE);

function useContrastColor(color: string) {
  return useMemo(
    () => tinycolor.mostReadable(color, ["#fff", "#000"]).toRgbString(),
    [color]
  );
}

export const MapMeasurePath = React.memo<{
  path: RRPoint[];
  color: string;
  mapBackgroundColor: string;
  zoom: number;
}>(function MapMeasurePath({ path, color, mapBackgroundColor, zoom }) {
  const last = pointAdd(pointScale(path[path.length - 1]!, GRID_SIZE), {
    x: GRID_SIZE * 1.5,
    y: GRID_SIZE * 0.5,
  });
  const diagonals = overlappingPairsSum(path, (a, b) =>
    a.x === b.x || a.y === b.y ? 0 : 1
  );
  const length = path.length - 1 + Math.floor(diagonals / 2);

  const pathContrastColor = useContrastColor(color);
  const mapContrastColor = useContrastColor(mapBackgroundColor);

  const FONT_SIZE = 14;
  const PADDING = 5;
  const FEET_BOX_WIDTH = 50;
  const FEET_BOX_HEIGHT = FONT_SIZE + PADDING * 2;

  return (
    <>
      {path.map((p, i) => {
        const r = centered(p);
        return (
          <circle key={i} r={dotSize / 2} fill={color} cx={r.x} cy={r.y} />
        );
      })}
      {overlappingPairsMap(path, (a, b, i) => {
        const start = centered(a);
        const end = centered(b);
        return (
          <RoughLine
            key={i}
            x={start.x}
            y={start.y}
            w={pointSubtract(end, start).x}
            h={pointSubtract(end, start).y}
            stroke={color}
          />
        );
      })}
      <g
        transform={`translate(${last.x},${
          last.y - FEET_BOX_HEIGHT / 2 / zoom
        }) scale(${1 / zoom})`}
      >
        <rect
          x={0}
          y={0}
          width={FEET_BOX_WIDTH}
          height={FONT_SIZE + PADDING * 2}
          fill={pathContrastColor}
          stroke={mapContrastColor}
        />
        <RoughText
          x={FEET_BOX_WIDTH / 2}
          y={PADDING}
          fill={color}
          fontSize={FONT_SIZE}
          fontWeight="bold"
          textAnchor="middle"
        >
          {length * 5}&thinsp;ft
        </RoughText>
      </g>
    </>
  );
});
