import React, { useMemo } from "react";
import tinycolor from "tinycolor2";
import {
  applyToPoint,
  compose,
  rotateDEG,
  toSVG,
  translate,
} from "transformation-matrix";
import { randomColor } from "../../../shared/colors";
import { GRID_SIZE } from "../../../shared/constants";
import { RRPoint } from "../../../shared/state";
import {
  makePoint,
  pointAdd,
  pointDistance,
  pointEquals,
  pointScale,
  pointSubtract,
  snapPointToGrid,
} from "../../point";
import { RoughRectangle } from "../rough";

function calculateSquaresForBurst(r: number): RRPoint[] {
  // must always be 0,0
  const origin = makePoint(0);

  const squares: RRPoint[] = [];

  for (let x = -r + 0.5; x <= r - 0.5; x++) {
    for (let y = -r + 0.5; y <= r - 0.5; y++) {
      const point = makePoint(x, y);
      const corners = [
        pointAdd(point, makePoint(+0.5, +0.5)),
        pointAdd(point, makePoint(+0.5, -0.5)),
        pointAdd(point, makePoint(-0.5, -0.5)),
        pointAdd(point, makePoint(-0.5, +0.5)),
      ];
      const middles = [
        pointAdd(point, makePoint(+0.0, +0.5)),
        pointAdd(point, makePoint(+0.0, -0.5)),
        pointAdd(point, makePoint(+0.5, +0.0)),
        pointAdd(point, makePoint(-0.5, +0.0)),
      ];
      if (
        corners.filter((corner) => pointDistance(corner, origin) <= r).length >=
          3 &&
        (r === 1 ||
          middles.filter((middle) => pointDistance(middle, origin) <= r)
            .length >= 3)
      ) {
        squares.push(point);
      }
    }
  }

  return squares;
}

// Circle around a point on a grid intersection
export function BurstArea({
  originX,
  originY,
  r,
}: {
  originX: number;
  originY: number;
  r: number;
}) {
  const color = useMemo(() => randomColor(), []);
  const squares = useMemo(() => calculateSquaresForBurst(r), [r]);

  return (
    <>
      {squares.map((square, i) => {
        const { x, y } = pointScale(
          pointAdd(
            pointSubtract(square, makePoint(0.5)), // top left of square
            makePoint(originX, originY)
          ),
          GRID_SIZE
        );

        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={GRID_SIZE}
            height={GRID_SIZE}
            fill={color}
          />
        );
      })}
      <circle
        cx={originX * GRID_SIZE}
        cy={originY * GRID_SIZE}
        r={r * GRID_SIZE}
        fill={tinycolor(color).setAlpha(0.3).toRgbString()}
      />
    </>
  );
}

function unique<E extends unknown>(
  elements: E[],
  comparator: (a: E, b: E) => boolean
) {
  const result: E[] = [];

  // this can certainly be done better.
  elements.forEach((element) => {
    if (result.every((each) => !comparator(each, element))) {
      result.push(element);
    }
  });

  return result;
}

// Circle around a token
export const EmanationArea = React.memo(function EmanationArea({
  creatureX,
  creatureY,
  creatureW,
  creatureH,
  r,
  fill,
}: {
  creatureX: number;
  creatureY: number;
  creatureW: number;
  creatureH: number;
  r: number;
  fill: string;
}) {
  const squares = useMemo(() => {
    const points = [];
    for (let x = 0; x <= creatureW; x++) {
      for (let y = 0; y <= creatureH; y++) {
        points.push(makePoint(x, y));
      }
    }

    const squares = calculateSquaresForBurst(r);

    return unique(
      points.flatMap((point) =>
        squares.map((square) => pointAdd(square, point))
      ),
      pointEquals
    );
  }, [r, creatureW, creatureH]);

  return (
    <>
      {squares.map((square, i) => {
        const { x, y } = pointScale(
          pointAdd(
            pointSubtract(square, makePoint(0.5)), // top left of square
            makePoint(creatureX, creatureY)
          ),
          GRID_SIZE
        );

        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={GRID_SIZE}
            height={GRID_SIZE}
            fill={fill}
          />
        );
      })}
    </>
  );
});

// TODO: Not yet working properly
export function LineArea({
  originX,
  originY,
  l,
  a: angleDegrees,
}: {
  originX: number;
  originY: number;
  l: number;
  a: number;
}) {
  const matrix = compose(
    rotateDEG(angleDegrees, originX * GRID_SIZE, originY * GRID_SIZE),
    translate(originX * GRID_SIZE, originY * GRID_SIZE)
  );

  return (
    <>
      <g transform={toSVG(matrix)}>
        <rect
          x={-0.5 * GRID_SIZE}
          y={-0.5 * GRID_SIZE}
          width={l * GRID_SIZE}
          height={GRID_SIZE}
          fill="lime"
          fillOpacity={0.2}
        />
        {Array.from({ length: l }).map((_, i) => (
          <circle key={i} cx={i * GRID_SIZE} cy={0} r={10} fill="black" />
        ))}
        <line
          stroke="orange"
          strokeWidth={5}
          x1={0}
          y1={0}
          x2={(l - 1) * GRID_SIZE}
          y2={0}
        />
      </g>
      {Array.from({ length: l }).map((_, i) => {
        const p = snapPointToGrid(
          applyToPoint(matrix, makePoint(i * GRID_SIZE, 0))
        );
        //return <circle key={i} cx={p.x} cy={p.y} r={10} fill="blue" />;
        return (
          <RoughRectangle
            key={i}
            x={p.x}
            y={p.y}
            w={GRID_SIZE}
            h={GRID_SIZE}
            fill="blue"
          />
        );
      })}
    </>
  );
}
