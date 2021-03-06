import React, { ImgHTMLAttributes } from "react";
import { RRAssetImage } from "../../../shared/state";
import { BlurHashImage } from "./BlurHashImage";

export const SVGBlurHashImage = React.forwardRef<
  HTMLImageElement,
  {
    image: RRAssetImage | { blurHash: string; url: string };
    tokenSize?: number;
    x: number;
    y: number;
    width: number;
    height: number;
  } & Partial<
    Omit<ImgHTMLAttributes<HTMLImageElement>, "width" | "height" | "src">
  >
>(function SVGBlurHashImage(
  { x, y, tokenSize: rawTokenSize, width, height, style, ...rest },
  ref
) {
  const tokenSize = rawTokenSize ?? 0;

  return (
    <foreignObject
      x={x}
      y={y}
      width={width}
      height={height}
      pointerEvents="none"
    >
      <BlurHashImage
        ref={ref}
        offset={tokenSize}
        width={width - tokenSize * 2}
        height={height - tokenSize * 2}
        style={{ pointerEvents: "all", ...style }}
        {...rest}
      />
    </foreignObject>
  );
});
