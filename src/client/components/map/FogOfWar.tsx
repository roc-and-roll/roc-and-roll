import React from "react";
import { RRCapPoint } from "../../../shared/state";
import Shape from "@doodle3d/clipper-js";
import { useMyself } from "../../myself";

export function FogOfWar({
  revealedAreas,
}: {
  revealedAreas: RRCapPoint[][] | null;
}) {
  const myself = useMyself();

  if (!revealedAreas) {
    return <></>;
  }

  const subjectPaths = [
    [
      { X: 1000, Y: 1000 },
      { X: -1000, Y: 1000 },
      { X: -1000, Y: -1000 },
      { X: 1000, Y: -1000 },
    ],
  ];
  const background = new Shape(subjectPaths, true);
  const remove = new Shape(revealedAreas, true);
  const result = background.difference(remove);

  return (
    <>
      {
        <path
          fill={`rgba(0, 0, 0, ${myself.isGM ? 0.3 : 1})`}
          fillRule="evenodd"
          d={
            result.paths
              .flatMap((p) =>
                p.map((p, i) => (i === 0 ? "M " : "L ") + `${p.X},${p.Y} `)
              )
              .join(" ") + "Z"
          }
        />
      }
      {false &&
        revealedAreas?.map((area, i) => (
          <polygon
            key={i}
            points={area.map((p) => `${p.X},${p.Y}`).join(" ")}
            fill="#999"
          />
        ))}
    </>
  );
}
