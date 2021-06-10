import React from "react";
import { applyToPoint, inverse, Matrix } from "transformation-matrix";
import { GRID_SIZE } from "../../../shared/constants";
import { RRColor } from "../../../shared/state";
import { makePoint } from "../../../shared/point";

export const MapGrid = React.memo<{
  transform: Matrix;
  color: RRColor;
}>(function MapGrid({ transform, color }) {
  const topLeft = applyToPoint(inverse(transform), makePoint(0));

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

      <rect
        x={topLeft.x}
        y={topLeft.y}
        width={`${100 / transform.a}%`}
        height={`${100 / transform.a}%`}
        className="map-grid"
        fill="url(#grid)"
      />
    </>
  );
});
