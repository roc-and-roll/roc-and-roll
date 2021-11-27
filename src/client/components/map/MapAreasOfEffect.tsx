import React from "react";
import { useRecoilValue } from "recoil";
import { RRMapAreaOfEffect, RRPlayerID, RRPoint } from "../../../shared/state";
import { RoughText } from "../rough";
import { ephemeralPlayersFamily } from "./recoil";
import { useContrastColor } from "../../util";
import { GRID_SIZE } from "../../../shared/constants";
import { pointScale, pointAdd, makePoint } from "../../../shared/point";

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

const centered = (p: RRPoint) =>
  pointScale(pointAdd(p, makePoint(0.5)), GRID_SIZE);

const MapAreaOfEffectInner = React.memo<{
  area: RRMapAreaOfEffect;
  color: string;
  mapBackgroundColor: string;
  zoom: number;
}>(function MapMeasurePathInner({ area, color, mapBackgroundColor, zoom }) {
  if (!area) return <></>;

  const dotSize = 10;

  const start = centered(area.startPoint);
  const end = centered(area.endPoint);

  const size = Math.hypot(start.x - end.x, start.y - end.y) + 0.5 * GRID_SIZE;

  return (
    <>
      <circle r={dotSize / 2} fill={color} cx={start.x} cy={start.y} />
      {
        //According to Xanathar's Guide, this would also be a square
      }
      {
        //<circle cx={start.x} cy={start.y} fill={"#fff5"} r={size} />
        //<rect
        //x={start.x - size}
        //y={start.y - size}
        //width={size * 2}
        //height={size * 2}
        //fill={"#fff5"}
        ///>
      }
      <Line
        start={start}
        end={end}
        zoom={zoom}
        color={color}
        mapBackgroundColor={mapBackgroundColor}
      />
    </>
  );
});

function SizeIndicator({
  point,
  length,
  zoom,
  color,
  mapBackgroundColor,
}: {
  point: RRPoint;
  length: number;
  zoom: number;
  color: string;
  mapBackgroundColor: string;
}) {
  const pathContrastColor = useContrastColor(color);
  const mapContrastColor = useContrastColor(mapBackgroundColor);
  const FONT_SIZE = 14;
  const PADDING = 5;
  const FEET_BOX_WIDTH = 50;
  const FEET_BOX_HEIGHT = FONT_SIZE + PADDING * 2;

  return (
    <g
      transform={`translate(${point.x},${
        point.y - FEET_BOX_HEIGHT / 2 / zoom
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
        {length}&thinsp;ft
      </RoughText>
    </g>
  );
}

function Line({
  start,
  end,
  zoom,
  color,
  mapBackgroundColor,
}: {
  start: RRPoint;
  end: RRPoint;
  zoom: number;
  color: string;
  mapBackgroundColor: string;
}) {
  const lengthX = (start.x - end.x) / GRID_SIZE;
  const lengthY = (start.y - end.y) / GRID_SIZE;

  //Number of fields I want in the line
  const length = Math.max(Math.abs(lengthY), Math.abs(lengthX));

  return (
    <>
      {Array.from({ length }, (_, index) => {
        //Skip the tile I am stading on
        index += 1;
        const { x, y } = {
          x: start.x - (Math.round(lengthX / length) * index + 0.5) * GRID_SIZE,
          y: start.y - (Math.round(lengthY / length) * index + 0.5) * GRID_SIZE,
        };

        return (
          <>
            <rect
              key={index}
              x={x}
              y={y}
              width={GRID_SIZE}
              height={GRID_SIZE}
              fill={"#fffa"}
            />
            <SizeIndicator
              point={end}
              length={length * 5}
              zoom={zoom}
              color={color}
              mapBackgroundColor={mapBackgroundColor}
            />
          </>
        );
      })}
    </>
  );
}
