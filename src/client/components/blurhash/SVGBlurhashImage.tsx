import React, { ImgHTMLAttributes } from "react";
import { RRFileImage } from "../../../shared/state";
import { BlurhashImage } from "./BlurhashImage";

export const SVGBlurHashImage = React.forwardRef<
  HTMLImageElement,
  {
    image: RRFileImage | { blurhash: string; url: string };
    x: number;
    y: number;
    width: number;
    height: number;
  } & Partial<
    Omit<ImgHTMLAttributes<HTMLImageElement>, "width" | "height" | "src">
  >
>(function SVGBlurHashImage({ x, y, ...rest }, ref) {
  return (
    <foreignObject x={x} y={y} width={rest.width} height={rest.height}>
      <BlurhashImage ref={ref} {...rest} />
    </foreignObject>
  );
});