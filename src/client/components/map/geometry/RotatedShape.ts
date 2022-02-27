import * as PIXI from "pixi.js";

export class RotatedShape {
  constructor(
    public shape: PIXI.Ellipse | PIXI.Circle | PIXI.Rectangle | PIXI.Polygon,
    public rotation: number
  ) {}
}
