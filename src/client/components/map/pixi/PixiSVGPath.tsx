import React, { useEffect, useRef } from "react";
import { Graphics } from "react-pixi-fiber";
import * as PIXI from "pixi.js";
import { colorValue, RRPixiProps } from "../pixi-utils";
import composeRefs from "@seznam/compose-react-refs";
import { applySVGPathToPixiGraphics } from "./svg-path-renderer/applySVGPathToPixiGraphics";

export const PixiSVGPath = React.forwardRef<
  PIXI.Graphics,
  {
    svgPath: string;
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
  } & Omit<RRPixiProps<PIXI.Graphics>, "stroke" | "strokeWidth" | "fill">
>(function PixiSVGPath(
  { svgPath, stroke, strokeWidth, fill, ...props },
  outerRef
) {
  const innerRef = useRef<PIXI.Graphics>(null);

  useEffect(() => {
    const instance = innerRef.current;
    if (!instance) {
      return;
    }

    instance.clear();

    if (
      strokeWidth !== undefined &&
      stroke !== undefined &&
      stroke !== "none"
    ) {
      const strokeColor = colorValue(stroke);
      instance.lineStyle(strokeWidth, strokeColor.color, strokeColor.alpha);
    }
    if (fill !== undefined && fill !== "none") {
      const fillColor = colorValue(fill);
      instance.beginFill(fillColor.color, fillColor.alpha);
    }

    applySVGPathToPixiGraphics(instance, svgPath);

    if (fill !== undefined && fill !== "none") {
      instance.endFill();
    }
  }, [svgPath, stroke, strokeWidth, fill]);

  return <Graphics ref={composeRefs(innerRef, outerRef)} {...props} />;
});
