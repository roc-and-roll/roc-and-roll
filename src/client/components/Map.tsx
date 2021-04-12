import React, { useState, WheelEvent } from "react";
import {
  scale,
  translate,
  compose,
  applyToPoint,
  Matrix,
  identity,
  toSVG,
} from "transformation-matrix";

export const Map: React.FC = () => {
  const [zoom, setZoom] = useState(1.0);
  const [transform, setTransform] = useState<Matrix>(identity());

  // const [origin, setOrigin] = useState([0, 0]);

  const handleWheel = (e: WheelEvent<SVGElement>) => {
    e.preventDefault();
    const rect = (e.target as SVGElement).getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;

    setTransform(
      compose(
        translate(localX, localY),
        scale(Math.pow(1.05, -(e.deltaY || 1))),
        translate(-localX, -localY),
        transform
      )
    );
    // setScale((s) => s * Math.pow(1.05, -(e.deltaY || 1)));
  };

  return (
    <svg onWheel={handleWheel}>
      <g transform={toSVG(transform)}>
        <text x="20" y="30">
          Test
        </text>
        <circle cx="30" cy="30" r="20" fill="red" />
      </g>
    </svg>
  );
};
