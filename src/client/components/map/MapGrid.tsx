import React from "react";
import { Matrix } from "transformation-matrix";
import { GRID_SIZE } from "../../../shared/constants";
import { RRColor } from "../../../shared/state";

export const MapGrid = React.memo<{
  transform: Matrix;
  color: RRColor;
}>(function MapGrid({ transform, color }) {
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
        x={-transform.e / transform.a}
        y={-transform.f / transform.a}
        width={`${100 / transform.a}%`}
        height={`${100 / transform.a}%`}
        fill="url(#grid)"
      />
    </>
  );
});
