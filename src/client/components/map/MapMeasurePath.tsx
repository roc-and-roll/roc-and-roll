import React from "react";
import { GRID_SIZE } from "../../../shared/constants";
import { EphemeralPlayer, RRPoint } from "../../../shared/state";
import {
  makePoint,
  pointAdd,
  pointScale,
  pointSubtract,
} from "../../../shared/point";
import { RoughLine, RoughText } from "../rough";
import { useContrastColor } from "../../util";
import { pathLength, shortestDistance } from "./mapHelpers";
import { PCircle, PRectangle } from "./Primitives";
import { Container } from "react-pixi-fiber";
import { colorValue } from "./pixi-utils";

const overlappingPairsMap = <T, U>(a: T[], f: (a: T, b: T, i: number) => U) => {
  const res: U[] = [];
  for (let i = 0; i < a.length - 1; i++) {
    res.push(f(a[i]!, a[i + 1]!, i));
  }
  return res;
};

const dotSize = 10;

const centered = (p: RRPoint) =>
  pointScale(pointAdd(p, makePoint(0.5)), GRID_SIZE);

export const MapMeasurePath = React.memo<{
  measurePath: EphemeralPlayer["measurePath"];
  color: string;
  mapBackgroundColor: string;
  zoom: number;
}>(function MapMeasurePath({ measurePath, color, mapBackgroundColor, zoom }) {
  if (measurePath.length === 0) {
    return null;
  }

  // Split this off into a separate component due to the early return above.
  return (
    <MapMeasurePathInner
      path={measurePath}
      color={color}
      mapBackgroundColor={mapBackgroundColor}
      zoom={zoom}
    />
  );
});

function MapMeasurePathInner({
  path,
  color,
  mapBackgroundColor,
  zoom,
}: {
  path: RRPoint[];
  color: string;
  mapBackgroundColor: string;
  zoom: number;
}) {
  const pathContrastColor = colorValue(useContrastColor(color)).color;
  const mapContrastColor = colorValue(
    useContrastColor(mapBackgroundColor)
  ).color;

  const last = pointAdd(pointScale(path[path.length - 1]!, GRID_SIZE), {
    x: GRID_SIZE * 1.5,
    y: GRID_SIZE * 0.5,
  });

  const firstPoint = path[0]!;
  const lastPoint = path[path.length - 1]!;

  const length =
    path.length === 2
      ? shortestDistance(firstPoint, lastPoint)
      : pathLength(path);

  const FONT_SIZE = 14;
  const PADDING = 5;
  const FEET_BOX_WIDTH = 50;
  const FEET_BOX_HEIGHT = FONT_SIZE + PADDING * 2;

  return (
    <>
      {path.map((p, i) => {
        const r = centered(p);
        return (
          <PCircle
            key={i}
            r={dotSize / 2}
            fill={colorValue(color).color}
            cx={r.x}
            cy={r.y}
          />
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
            seed={i.toString()}
          />
        );
      })}
      <Container
        x={last.x}
        y={last.y - FEET_BOX_HEIGHT / 2 / zoom}
        scale={1 / zoom}
      >
        <PRectangle
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
          style={{
            fill: color,
            fontSize: FONT_SIZE,
            fontWeight: "bold",
          }}
          // \u2009 == &thinsp;
          text={`${length * 5}\u2009ft`}
          anchor={{ x: 0.5, y: 0 }}
        />
      </Container>
    </>
  );
}
