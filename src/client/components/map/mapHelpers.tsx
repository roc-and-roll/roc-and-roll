import { GRID_SIZE } from "../../../shared/constants";
import {
  pointScale,
  snapPointToGrid,
  pointDistance,
  pointAdd,
  makePoint,
  pointEquals,
  pointSign,
  pointSubtract,
} from "../../../shared/point";
import { RRPoint } from "../../../shared/state";

export function getPathWithNewPoint(path: RRPoint[], newPoint: RRPoint) {
  const gridPosition = pointScale(snapPointToGrid(newPoint), 1 / GRID_SIZE);
  if (path.length < 1) return [gridPosition];
  console.log(newPoint);
  console.log(gridPosition);

  // to make moving along a diagonal easier, we only count hits that are not on the corners
  const radius = (GRID_SIZE * 0.8) / 2;
  const isInCenter =
    pointDistance(
      pointScale(pointAdd(gridPosition, makePoint(0.5)), GRID_SIZE),
      newPoint
    ) < radius;
  console.log(
    pointDistance(
      pointScale(pointAdd(gridPosition, makePoint(0.5)), GRID_SIZE),
      newPoint
    )
  );

  const pointsToReach = (from: RRPoint, to: RRPoint) => {
    const points: RRPoint[] = [];
    while (!pointEquals(from, to)) {
      const step = pointSign(pointSubtract(to, from));
      from = pointAdd(from, step);
      points.push(from);
    }
    return points;
  };

  if (
    isInCenter &&
    (path.length < 1 || !pointEquals(path[path.length - 1]!, gridPosition))
  ) {
    if (
      path.length > 1 &&
      path.slice(1).some((p) => pointEquals(p, gridPosition))
    ) {
      return path.slice(
        0,
        path.findIndex((p) => pointEquals(p, gridPosition))!
      );
    } else {
      return [...path, ...pointsToReach(path[path.length - 1]!, gridPosition)];
    }
  }
  return path;
}

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

export function shortestDistance(from: RRPoint, to: RRPoint) {
  const points: RRPoint[] = [from];
  while (!pointEquals(from, to)) {
    const step = pointSign(pointSubtract(to, from));
    from = pointAdd(from, step);
    points.push(from);
  }

  const diagonals = overlappingPairsSum(points, (a, b) =>
    a.x === b.x || a.y === b.y ? 0 : 1
  );
  return points.length - 1 + Math.floor(diagonals / 2);
}
