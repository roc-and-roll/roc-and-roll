import React, { useContext, useMemo } from "react";
import { AppContext, TilingSprite } from "react-pixi-fiber";
import { Matrix } from "transformation-matrix";
import { GRID_SIZE } from "../../../shared/constants";
import { RRColor } from "../../../shared/state";
import { getViewportCorners } from "../../util";
import { ViewPortSizeContext } from "./MapContainer";
import * as PIXI from "pixi.js";
import { colorValue } from "./pixi-utils";
import { snapPointToGrid } from "../../../shared/point";

const STROKE_WIDTH = 2;

export const MapGrid = React.memo<{
  transform: Matrix;
  color: RRColor;
}>(function MapGrid({ transform, color }) {
  const viewPortSize = useContext(ViewPortSizeContext);
  const corners = getViewportCorners(transform, viewPortSize);

  const app = useContext(AppContext);

  const strokeWidth =
    transform.a >= 1
      ? STROKE_WIDTH
      : transform.a < 1 / 4
      ? null
      : Math.min(Math.ceil(STROKE_WIDTH / transform.a), STROKE_WIDTH * 2);
  const scaleMode =
    transform.a > 0.5 ? PIXI.SCALE_MODES.NEAREST : PIXI.SCALE_MODES.LINEAR;

  const graphics = useMemo(() => {
    const graphics = new PIXI.Graphics();
    graphics.name = "grid-texture";
    return graphics;
  }, []);

  // TODO: There is a leak somewhere: When toggling the grid on and off,
  // additional PIXI.Graphics objects are created.
  // This does not help:
  // useEffect(() => {
  //   return () => {
  //     graphics.destroy(true);
  //   };
  // }, [graphics]);

  const texture = useMemo(() => {
    if (strokeWidth === null) {
      return null;
    }

    graphics.clear();
    const strokeColor = colorValue(color);
    graphics.lineStyle(strokeWidth / 2, strokeColor.color, strokeColor.alpha);
    graphics.drawRect(
      0,
      0,
      GRID_SIZE - strokeWidth / 2,
      GRID_SIZE - strokeWidth / 2
    );
    return app.renderer.generateTexture(graphics, { scaleMode });
  }, [graphics, color, strokeWidth, app.renderer, scaleMode]);

  const topLeft = snapPointToGrid(corners[0]);

  return texture ? (
    <TilingSprite
      texture={texture}
      x={topLeft.x}
      y={topLeft.y}
      width={corners[2].x - topLeft.x}
      height={corners[1].y - topLeft.y}
    />
  ) : null;
});
