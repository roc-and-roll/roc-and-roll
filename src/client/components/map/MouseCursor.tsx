import React, { useRef, useState, useEffect } from "react";
import { Matrix } from "transformation-matrix";
import { GRID_SIZE } from "../../../shared/constants";
import { EphemeralPlayer, RRColor, RRPoint } from "../../../shared/state";
import {
  makePoint,
  pointAdd,
  pointClamp,
  pointScale,
  pointSubtract,
} from "../../../shared/point";
import useRafLoop from "../../useRafLoop";
import { RoughPolygon, RoughText } from "../rough";
import { CURSOR_POSITION_SYNC_DEBOUNCE } from "./Map";
import { getViewportCorners } from "../../util";
import { Container } from "react-pixi-fiber";

export const MouseCursor = React.memo<{
  mapMouse: EphemeralPlayer["mapMouse"];
  playerName: string;
  playerColor: RRColor;
  transform: Matrix;
  viewPortSize: RRPoint;
  contrastColor: RRColor;
}>(function MouseCursor({ mapMouse, ...props }) {
  if (mapMouse === null) {
    return null;
  }

  return <MouseCursorInner {...props} mapMouse={mapMouse} />;
});

const MouseCursorInner = React.memo<{
  mapMouse: NonNullable<EphemeralPlayer["mapMouse"]>;
  playerName: string;
  playerColor: RRColor;
  transform: Matrix;
  viewPortSize: RRPoint;
  contrastColor: RRColor;
}>(function MouseCursorInner({ transform, viewPortSize, ...props }) {
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

  // TODO: Clamping does not work correctly in 2.5D
  const viewportCorners = getViewportCorners(transform, viewPortSize);
  const padding = pointScale(makePoint(GRID_SIZE / 4), 1 / transform.a);
  const clampedPosition = pointClamp(
    pointAdd(viewportCorners[0], padding),
    position,
    pointSubtract(viewportCorners[2], padding)
  );

  return (
    <Container
      x={clampedPosition.x}
      y={clampedPosition.y}
      scale={0.5 / transform.a}
    >
      <RoughPolygon
        x={0}
        y={0}
        points={[
          { x: 0, y: GRID_SIZE },
          { x: (GRID_SIZE * 5) / 7, y: GRID_SIZE },
        ]}
        fillStyle="solid"
        fill={props.playerColor}
        stroke={props.contrastColor}
      />
      <RoughText
        x={0}
        y={GRID_SIZE * 1.1}
        style={{ fontSize: "2rem", fill: props.contrastColor }}
        text={props.playerName}
      />
    </Container>
  );
});
