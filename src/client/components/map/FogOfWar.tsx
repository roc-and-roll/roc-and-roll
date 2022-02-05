import React, { useContext, useDeferredValue, useMemo } from "react";
import { RRMapRevealedAreas, RRPoint } from "../../../shared/state";
import Shape from "@doodle3d/clipper-js";
import { useMyProps } from "../../myself";
import { Matrix } from "transformation-matrix";
import { toCap } from "../../../shared/point";
import { getViewportCorners } from "../../util";
import { ViewPortSizeContext } from "./MapContainer";
import { ClipperPolygon } from "./Primitives";

export const FogOfWar = React.memo(function FogOfWar({
  revealedAreas: upToDateRevealedAreas,
  transform,
}: {
  revealedAreas: RRMapRevealedAreas;
  transform: Matrix;
}) {
  const viewPortSize = useContext(ViewPortSizeContext);
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
      viewportSize={viewPortSize}
      isGM={myself.isGM}
    />
  );
});

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

  const sharedProps = { alpha: isGM ? 0.3 : 1, fill: 0x000000 };
  return (
    <>
      <ClipperPolygon {...sharedProps} shape={result} />
      <ClipperPolygon {...sharedProps} shape={outerFill} />
    </>
  );
};
