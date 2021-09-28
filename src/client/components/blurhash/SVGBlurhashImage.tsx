import React, { ImgHTMLAttributes } from "react";
import { RRFileImage } from "../../../shared/state";
import { BlurhashImage } from "./BlurhashImage";

export const SVGBlurHashImage = React.forwardRef<
  HTMLImageElement,
  {
    image: RRFileImage | { blurhash: string; url: string };
    tokenSize: number;
    x: number;
    y: number;
    width: number;
    height: number;
  } & Partial<
    Omit<ImgHTMLAttributes<HTMLImageElement>, "width" | "height" | "src">
  >
>(function SVGBlurHashImage({ x, y, tokenSize, width, height, ...rest }, ref) {
  return (
    <foreignObject x={x} y={y} width={width} height={height}>
      <BlurhashImage
        ref={ref}
        offset={tokenSize}
        width={width - tokenSize * 2}
        height={height - tokenSize * 2}
        {...rest}
      />
    </foreignObject>
  );
});
