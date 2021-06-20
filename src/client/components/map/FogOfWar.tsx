import React from "react";
import { RRCapPoint, RRPoint } from "../../../shared/state";
import Shape from "@doodle3d/clipper-js";
import { useMyself } from "../../myself";
import { Matrix } from "transformation-matrix";
import { toCap } from "../../../shared/point";
import { getViewportCorners } from "../../util";

export function FogOfWar({
  revealedAreas,
  transform,
  viewportSize,
}: {
  revealedAreas: RRCapPoint[][] | null;
  transform: Matrix;
  viewportSize: RRPoint;
}) {
  const myself = useMyself();

  if (!revealedAreas) {
    return <></>;
  }

  const remove = new Shape(revealedAreas, true);
  const b = remove.shapeBounds();

  const background = new Shape(
    [
      [
        { X: b.left, Y: b.top },
        { X: b.right, Y: b.top },
        { X: b.right, Y: b.bottom },
        { X: b.left, Y: b.bottom },
      ],
    ],
    true
  );
  const result = background.difference(remove);

  const viewport = new Shape([
    getViewportCorners(transform, viewportSize).map((point) => toCap(point)),
  ]);
  const outerFill = viewport.difference(background);

  const shapeToSVGPath = (shape: Shape) => {
    const points = shape.paths.flatMap((p) =>
      p.map((p, i) => (i === 0 ? "M " : "L ") + `${p.X},${p.Y} `)
    );
    return points.length === 0 ? null : (
      <path
        className="map-reveal-areas"
        fill={`rgba(0, 0, 0, ${myself.isGM ? 0.3 : 1})`}
        fillRule="evenodd"
        d={points.join(" ") + "Z"}
      />
    );
  };

  return (
    <>
      {shapeToSVGPath(result)}
      {shapeToSVGPath(outerFill)}
    </>
  );
}
