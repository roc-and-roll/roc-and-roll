import React, { useContext, useMemo } from "react";
import { AppContext, TilingSprite } from "react-pixi-fiber";
import { Matrix } from "transformation-matrix";
import { GRID_SIZE } from "../../../shared/constants";
import { RRColor } from "../../../shared/state";
import { getViewportCorners } from "../../util";
import { ViewPortSizeContext } from "./MapContainer";
import * as PIXI from "pixi.js";
import { colorValue } from "./pixi-utils";

const STROKE_WIDTH = 1;

export const MapGrid = React.memo<{
  transform: Matrix;
  color: RRColor;
}>(function MapGrid({ transform, color }) {
  const viewPortSize = useContext(ViewPortSizeContext);
  // TODO: The grid needs to probably take these into account to properly scale
  // and move.
  const corners = getViewportCorners(transform, viewPortSize)
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  const app = useContext(AppContext);
  const texture = useMemo(() => {
    const graphics = new PIXI.Graphics();
    graphics.beginFill(colorValue(color));
    graphics.drawRect(0, 0, STROKE_WIDTH / 2, GRID_SIZE);
    graphics.drawRect(0, 0, GRID_SIZE, STROKE_WIDTH / 2);
    graphics.drawRect(
      GRID_SIZE - STROKE_WIDTH / 2,
      0,
      STROKE_WIDTH / 2,
      GRID_SIZE
    );
    graphics.drawRect(
      0,
      GRID_SIZE - STROKE_WIDTH / 2,
      GRID_SIZE,
      STROKE_WIDTH / 2
    );
    graphics.endFill();
    return app.renderer.generateTexture(graphics);
  }, [color, app.renderer]);

  return (
    <TilingSprite
      texture={texture}
      x={0}
      y={0}
      width={viewPortSize.x}
      height={viewPortSize.y}
    />
  );
});
