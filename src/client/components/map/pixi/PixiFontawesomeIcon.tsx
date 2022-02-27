import React from "react";
import * as PIXI from "pixi.js";
import { IconDefinition } from "@fortawesome/fontawesome-common-types";
import { PixiSVGPath } from "./PixiSVGPath";

export const PixiFontawesomeIcon = React.forwardRef<
  PIXI.Graphics,
  { icon: IconDefinition; width: number; height: number } & Omit<
    React.ComponentProps<typeof PixiSVGPath>,
    "svgPath" | "scale" | "width" | "height"
  >
>(function PixiFontawesomeIcon({ icon, width, height, ...props }, ref) {
  const [iconWidth, iconHeight, _1, _2, iconPathData] = icon.icon;
  if (Array.isArray(iconPathData)) {
    throw new Error("Not yet supported.");
  }

  // Scale proportionally to fit the desired size.
  const scale = Math.min(width / iconWidth, height / iconHeight);

  return (
    <PixiSVGPath
      ref={ref}
      svgPath={iconPathData}
      scale={{ x: scale, y: scale }}
      {...props}
    />
  );
});
