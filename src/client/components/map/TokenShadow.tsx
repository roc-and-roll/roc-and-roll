import React from "react";
import * as PIXI from "pixi.js";
import haloImage from "./halo.png";
import { Sprite } from "react-pixi-fiber";

export function TokenShadow({
  color,
  pulse,
  size,
}: {
  color: number;
  pulse: number;
  size: number;
}) {
  const totalSize = size * 2;
  return (
    <Sprite
      width={totalSize}
      height={totalSize}
      x={-size / 2}
      y={-size / 2}
      tint={color}
      texture={PIXI.Texture.from(haloImage)}
    />
  );
}
