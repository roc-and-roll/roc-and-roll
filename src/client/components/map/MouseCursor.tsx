import React, { useRef, useState, useEffect } from "react";
import { useRecoilValue } from "recoil";
import { GRID_SIZE } from "../../../shared/constants";
import {
  EphermalPlayer,
  RRColor,
  RRPlayerID,
  RRPoint,
} from "../../../shared/state";
import useRafLoop from "../../useRafLoop";
import { RoughSVGPath, RoughText } from "../rough";
import { CURSOR_POSITION_SYNC_DEBOUNCE } from "./Map";
import { ephermalPlayersFamily } from "./MapContainer";

export const MouseCursor = React.memo<{
  playerId: RRPlayerID;
  playerName: string;
  playerColor: RRColor;
  zoom: number;
  contrastColor: RRColor;
}>(function MouseCursor(props) {
  const ephermalPlayer = useRecoilValue(ephermalPlayersFamily(props.playerId));

  if (ephermalPlayer === null || ephermalPlayer.mapMouse === null) {
    return null;
  }

  return <MouseCursorInner {...props} mapMouse={ephermalPlayer.mapMouse} />;
});

const MouseCursorInner = React.memo<{
  playerId: RRPlayerID;
  playerName: string;
  playerColor: RRColor;
  zoom: number;
  contrastColor: RRColor;
  mapMouse: NonNullable<EphermalPlayer["mapMouse"]>;
}>(function MouseCursorInner(props) {
  const [rafStart, rafStop] = useRafLoop();

  const prevPosition = useRef<RRPoint | null>(null);
  const [position, setPosition] = useState(props.mapMouse.position);

  // Animate position changes
  useEffect(() => {
    const end = props.mapMouse.position;
    if (prevPosition.current) {
      const start = prevPosition.current;
      const points = [start, ...props.mapMouse.positionHistory, end];

      rafStart((linear) => {
        // we cannot use non-linear lerping, because that looks weird for continuous mouse movements
        const t = linear; // linear === 1 ? 1 : Math.sin((linear * Math.PI) / 2);

        // part of [0..1] that corresponds to the lerping between two
        // waypoints.
        const tPerPoint = 1 / (points.length - 1);

        const pointIdx =
          t === 1 ? points.length - 2 : Math.floor(t / tPerPoint);

        // percentage of the lerping of the current point.
        const pointT = (t - pointIdx * tPerPoint) / tPerPoint;

        const s = points[pointIdx]!;
        const e = points[pointIdx + 1]!;

        setPosition({
          x: s.x + (e.x - s.x) * pointT,
          y: s.y + (e.y - s.y) * pointT,
        });
      }, CURSOR_POSITION_SYNC_DEBOUNCE);
    }
    prevPosition.current = end;

    return () => {
      rafStop();
    };
  }, [prevPosition, props.mapMouse.position, props.mapMouse.positionHistory, rafStart, rafStop]);

  return (
    <g
      transform={`translate(${position.x},${position.y}) scale(${
        0.5 / props.zoom
      })`}
    >
      <RoughSVGPath
        // https://mavo.io/demos/svgpath/
        x={0}
        y={0}
        path={`m 0 0 v ${GRID_SIZE} h ${(GRID_SIZE * 5) / 7} l ${
          (-GRID_SIZE * 5) / 7
        } ${-GRID_SIZE}`}
        fillStyle="solid"
        fill={props.playerColor}
        stroke={props.contrastColor}
      />
      <RoughText
        x={0}
        y={GRID_SIZE * 1.1}
        fontSize="2rem"
        fill={props.contrastColor}
      >
        {props.playerName}
      </RoughText>
    </g>
  );
});
