import React, { useDeferredValue, useMemo } from "react";
import { RRMapRevealedAreas, RRPoint } from "../../../shared/state";
import Shape from "@doodle3d/clipper-js";
import { useMyProps } from "../../myself";
import { Matrix } from "transformation-matrix";
import { toCap } from "../../../shared/point";
import { getViewportCorners } from "../../util";

export const FogOfWar = React.memo(function FogOfWar({
  revealedAreas: upToDateRevealedAreas,
  transform,
  viewportSize,
}: {
  revealedAreas: RRMapRevealedAreas;
  transform: Matrix;
  viewportSize: RRPoint;
}) {
  const myself = useMyProps("isGM");
  const deferredRevealedAreas = useDeferredValue(upToDateRevealedAreas);
  const revealedAreas = myself.isGM
    ? upToDateRevealedAreas
    : deferredRevealedAreas;

  if (revealedAreas === null) {
    return null;
  }

  return (
    <FogOfWarInner
      revealedAreas={revealedAreas}
      transform={transform}
      viewportSize={viewportSize}
      isGM={myself.isGM}
    />
  );
});

const useShapeToSVGPath = (shape: Shape, isGM: boolean) => {
  return useMemo(() => {
    const points = shape.paths.flatMap((p) =>
      p.map((p, i) => (i === 0 ? "M " : "L ") + `${p.X},${p.Y} `)
    );
    return points.length === 0 ? null : (
      <path
        className="map-reveal-areas"
        fill={`rgba(0, 0, 0, ${isGM ? 0.3 : 1})`}
        fillRule="evenodd"
        d={points.join(" ") + "Z"}
      />
    );
  }, [isGM, shape]);
};

const FogOfWarInner = ({
  revealedAreas,
  transform,
  viewportSize,
  isGM,
}: {
  revealedAreas: NonNullable<RRMapRevealedAreas>;
  transform: Matrix;
  viewportSize: RRPoint;
  isGM: boolean;
}) => {
  const remove = useMemo(() => new Shape(revealedAreas, true), [revealedAreas]);

  const background = useMemo(() => {
    const b = remove.shapeBounds();

    return new Shape(
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
  }, [remove]);

  const result = useMemo(() => {
    return background.difference(remove);
  }, [background, remove]);

  const corners = useMemo(
    () =>
      getViewportCorners(transform, viewportSize).map((point) => toCap(point)),
    [transform, viewportSize]
  );

  const outerFill = useMemo(() => {
    const viewport = new Shape([corners]);
    return viewport.difference(background);
  }, [background, corners]);

  return (
    <>
      {useShapeToSVGPath(result, isGM)}
      {useShapeToSVGPath(outerFill, isGM)}
    </>
  );
};
