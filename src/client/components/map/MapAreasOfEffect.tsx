import React from "react";
import { useRecoilValue } from "recoil";
import { RRMapAreaOfEffect, RRPlayerID, RRPoint } from "../../../shared/state";
import { RoughText } from "../rough";
import { ephemeralPlayersFamily } from "./recoil";
import { useContrastColor } from "../../util";
import { makePoint, pointAdd, pointScale } from "../../../shared/point";
import { GRID_SIZE } from "../../../shared/constants";

export const MapAreaOfEffect = React.memo<{
  ephemeralPlayerId: RRPlayerID;
  color: string;
  mapBackgroundColor: string;
  zoom: number;
}>(function MapMeasurePath({
  ephemeralPlayerId,
  color,
  mapBackgroundColor,
  zoom,
}) {
  const ephemeralPlayer = useRecoilValue(
    ephemeralPlayersFamily(ephemeralPlayerId)
  );

  const area = ephemeralPlayer?.area;
  if (!area) {
    return null;
  }

  // Split this off into a separate component so that we avoid re-rendering if
  // something other than the path of the ephemeral player changes.
  return (
    <MapAreaOfEffectInner
      area={area}
      color={color}
      mapBackgroundColor={mapBackgroundColor}
      zoom={zoom}
    />
  );
});

const MapAreaOfEffectInner = React.memo<{
  area: RRMapAreaOfEffect;
  color: string;
  mapBackgroundColor: string;
  zoom: number;
}>(function MapMeasurePathInner({ area, color, mapBackgroundColor, zoom }) {
  const pathContrastColor = useContrastColor(color);
  const mapContrastColor = useContrastColor(mapBackgroundColor);
  if (!area) return <></>;

  const FONT_SIZE = 14;
  const PADDING = 5;
  const FEET_BOX_WIDTH = 50;
  const FEET_BOX_HEIGHT = FONT_SIZE + PADDING * 2;
  const dotSize = 10;

  const centered = (p: RRPoint) =>
    pointScale(pointAdd(p, makePoint(0.5)), GRID_SIZE);

  const start = centered(area.startPoint);
  const end = centered(area.endPoint);

  const size = Math.hypot(start.x - end.x, start.y - end.y) + 0.5 * GRID_SIZE;

  return (
    <>
      <circle r={dotSize / 2} fill={color} cx={start.x} cy={start.y} />
      {
        //According to Xanathar's Guide, this would also be a square
      }
      <circle cx={start.x} cy={start.y} fill={"#fff5"} r={size} />
      <rect
        x={start.x - size}
        y={start.y - size}
        width={size * 2}
        height={size * 2}
        fill={"#fff5"}
      />
      <Line start={start} end={end}></Line>
      <g
        transform={`translate(${end.x},${
          end.y - FEET_BOX_HEIGHT / 2 / zoom
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
          {(size / GRID_SIZE - 0.5) * 5}&thinsp;ft
        </RoughText>
      </g>
    </>
  );
});

function Line({ start, end }: { start: RRPoint; end: RRPoint }) {
  const lengthX = (start.x - end.x) / GRID_SIZE;
  const lengthY = (start.y - end.y) / GRID_SIZE;

  //Number of fields I want in the line
  const length = Math.max(Math.abs(lengthY), Math.abs(lengthX));

  const fixedEnd =
    length === 0
      ? start
      : {
          x: start.x - Math.round(lengthX / length) * length * GRID_SIZE,
          y: start.y - Math.round(lengthY / length) * length * GRID_SIZE,
        };

  return (
    <line
      x1={start.x}
      y1={start.y}
      x2={fixedEnd.x}
      y2={fixedEnd.y}
      strokeWidth={GRID_SIZE}
      stroke={"#fff5"}
    />
  );
}
