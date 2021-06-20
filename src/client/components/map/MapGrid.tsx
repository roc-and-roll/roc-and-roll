import React from "react";
import { Matrix } from "transformation-matrix";
import { GRID_SIZE } from "../../../shared/constants";
import { RRColor, RRPoint } from "../../../shared/state";
import { getViewportCorners } from "../../util";

export const MapGrid = React.memo<{
  transform: Matrix;
  viewPortSize: RRPoint;
  color: RRColor;
}>(function MapGrid({ transform, viewPortSize, color }) {
  const corners = getViewportCorners(transform, viewPortSize)
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  return (
    <>
      <defs>
        <pattern
          id="grid"
          width={GRID_SIZE}
          height={GRID_SIZE}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
            fill="none"
            stroke={color}
            strokeWidth="1"
          />
        </pattern>
      </defs>

      <polygon points={corners} className="map-grid" fill="url(#grid)" />
    </>
  );
});
