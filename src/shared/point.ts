import { GRID_SIZE } from "./constants";
import { RRCapPoint, RRPoint } from "./state";
import { clamp } from "./util";

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

export const pointDistance = (p1: RRPoint, p2: RRPoint) => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export const pointSign = (p: RRPoint) => ({
  x: Math.sign(p.x),
  y: Math.sign(p.y),
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
