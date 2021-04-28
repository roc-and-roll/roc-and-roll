import React from "react";
import { GRID_SIZE } from "../../../shared/constants";
import { RRPoint } from "../../../shared/state";
import { makePoint, pointAdd, pointScale } from "../../point";

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

export function MapMeasurePath({
  path,
  color,
  zoom,
}: {
  path: RRPoint[];
  color: string;
  zoom: number;
}) {
  const last = pointAdd(pointScale(path[path.length - 1]!, GRID_SIZE), {
    x: GRID_SIZE * 1.5,
    y: 0,
  });
  const dotSize = 10;
  const diagonals = overlappingPairsSum(path, (a, b) =>
    a.x === b.x || a.y === b.y ? 0 : 1
  );
  const length = path.length - 1 + Math.floor(diagonals / 2);
  const fontSize = 14 / zoom;
  const fontPadding = 5;

  const centered = (p: RRPoint) =>
    pointScale(pointAdd(p, makePoint(0.5)), GRID_SIZE);
  return (
    <>
      {path.map((p, i) => {
        const r = centered(p);
        return (
          <circle key={i} r={dotSize / 2} fill={color} cx={r.x} cy={r.y} />
        );
      })}
      {overlappingPairsMap(path, (a, b, i) => (
        <line
          key={i}
          x1={centered(a).x}
          y1={centered(a).y}
          x2={centered(b).x}
          y2={centered(b).y}
          stroke={color}
          style={{ strokeWidth: 3 }}
        />
      ))}
      <rect
        x={last.x - fontPadding}
        y={last.y - fontSize - fontPadding}
        width={50}
        height={fontSize + fontPadding * 2}
        fill="#ffffff"
      />
      <text x={last.x} y={last.y} fill={color} fontSize={fontSize}>
        {`${length * 5}ft`}
      </text>
    </>
  );
}
