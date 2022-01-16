import { Graphics } from "react-pixi-fiber";
import * as PIXI from "pixi.js";
import { useEffect, useRef } from "react";
import React from "react";
import composeRefs from "@seznam/compose-react-refs";

type CustomGraphicsProps<T> = T & Omit<Graphics, "geometry" | keyof T>;

export const PRectangle = React.forwardRef<
  PIXI.Graphics,
  CustomGraphicsProps<{
    fill?: number;
    width: number;
    height: number;
    alpha?: number;
    stroke?: number;
    strokeWidth?: number;
  }>
>(function PRectangle(
  { fill, width, height, alpha, stroke, strokeWidth, ...rest },
  externalRef
) {
  const internalRef = useRef<PIXI.Graphics>(null);

  useEffect(() => {
    const instance = internalRef.current;
    if (!instance) {
      return;
    }
    instance.clear();
    instance.beginFill(fill ?? 0xff0000, alpha ?? 1);
    if (stroke) instance.lineStyle(strokeWidth ?? 1, stroke);
    instance.drawRect(0, 0, width, height);
    instance.endFill();
  }, [alpha, fill, height, stroke, strokeWidth, width]);

  return <Graphics ref={composeRefs(internalRef, externalRef)} {...rest} />;
});

export const PCircle = React.forwardRef<
  PIXI.Graphics,
  CustomGraphicsProps<{
    cx: number;
    cy: number;
    r: number;
    fill: number;
    stroke?: number;
    strokeWidth?: number;
    alpha: number;
  }>
>(function PCircle(
  { cx, cy, r, fill, stroke, strokeWidth, alpha, ...rest },
  externalRef
) {
  const internalRef = useRef<PIXI.Graphics>(null);

  useEffect(() => {
    const instance = internalRef.current;
    if (!instance) {
      return;
    }
    instance.clear();
    instance.beginFill(fill, alpha);
    if (strokeWidth !== undefined && stroke !== undefined) {
      instance.lineStyle(strokeWidth, stroke);
    }
    instance.drawCircle(cx, cy, r);
    instance.endFill();
  }, [alpha, cx, cy, fill, r, stroke, strokeWidth]);

  return <Graphics ref={composeRefs(internalRef, externalRef)} {...rest} />;
});
