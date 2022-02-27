import { GRID_SIZE } from "./constants";
import { RRCapPoint, RRPoint } from "./state";
import { clamp } from "./util";

export const pointLeftRotate = (p: RRPoint) => ({
  x: p.y,
  y: -p.x,
});

export const pointSubtract = (p1: RRPoint, p2: RRPoint) => ({
  x: p1.x - p2.x,
  y: p1.y - p2.y,
});

export const pointAdd = (p1: RRPoint, p2: RRPoint) => ({
  x: p1.x + p2.x,
  y: p1.y + p2.y,
});

export const makePoint = (x: number, y?: number): RRPoint => ({
  x: x,
  y: y ?? x,
});

export const pointEquals = (p1: RRPoint, p2: RRPoint) =>
  p1.x === p2.x && p1.y === p2.y;

export const pointScale = (p: RRPoint, s: number) => ({
  x: p.x * s,
  y: p.y * s,
});

export const pointNormalize = (p: RRPoint) => {
  const length = pointDistance(p, { x: 0, y: 0 });
  return {
    x: p.x / length,
    y: p.y / length,
  };
};

export const pointRotate = (p: RRPoint, degrees: number, origin: RRPoint) => {
  return pointAdd(pointRotate00(pointSubtract(p, origin), degrees), origin);
};

const pointRotate00 = (p: RRPoint, degrees: number) => {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: Math.cos(radians) * p.x - Math.sin(radians) * p.y,
    y: Math.sin(radians) * p.x + Math.cos(radians) * p.y,
  };
};

export const pointDistance = (p1: RRPoint, p2: RRPoint) => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.hypot(dx, dy);
};

export const pointSign = (p: RRPoint) => ({
  x: Math.sign(p.x),
  y: Math.sign(p.y),
});

export const pointRound = (p: RRPoint) => ({
  x: Math.round(p.x),
  y: Math.round(p.y),
});

export const pointMin = (a: RRPoint, b: RRPoint) => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
});

export const pointMax = (a: RRPoint, b: RRPoint) => ({
  x: Math.max(a.x, b.x),
  y: Math.max(a.y, b.y),
});

const snapToGrid = (num: number) => Math.floor(num / GRID_SIZE) * GRID_SIZE;

export const snapPointToGrid = (p: RRPoint) => ({
  x: snapToGrid(p.x),
  y: snapToGrid(p.y),
});

export const toCap = (p: RRPoint): RRCapPoint => ({
  X: p.x,
  Y: p.y,
});

export const pointClamp = (min: RRPoint, p: RRPoint, max: RRPoint) => ({
  x: clamp(min.x, p.x, max.x),
  y: clamp(min.y, p.y, max.y),
});
