import React from "react";
import { RRMapLink } from "../../../shared/state";
import { RoughRectangle } from "../rough";

export function MapLink({ link }: { link: RRMapLink }) {
  return (
    <RoughRectangle
      w={30}
      h={30}
      x={link.position.x}
      y={link.position.y}
    ></RoughRectangle>
  );
}
