import { GRID_SIZE } from "../shared/constants";
import { RRPoint } from "../shared/state";

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
