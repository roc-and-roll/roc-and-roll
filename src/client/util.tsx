import React, { useMemo } from "react";
import tinycolor from "tinycolor2";
import { applyToPoint, inverse, Matrix } from "transformation-matrix";
import { makePoint } from "../shared/point";
import { RRPoint, RRTimestamp } from "../shared/state";

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const noop = () => {};

export const isBrowser = typeof window !== "undefined";

export function formatTimestamp(timestamp: RRTimestamp) {
  return new Date(timestamp).toLocaleString();
}

export function partition<E, A extends E = E, B extends E = E>(
  arr: E[],
  fn: (each: E) => boolean
) {
  const a = [] as A[];
  const b = [] as B[];

  arr.forEach((each) => {
    if (fn(each)) {
      a.push(each as A);
    } else {
      b.push(each as B);
    }
  });

  return [a, b] as const;
}

export const contrastColor = (color: string) =>
  tinycolor.mostReadable(color, ["#000", "#fff"]).toRgbString();

export function useContrastColor(color: string) {
  return useMemo(() => contrastColor(color), [color]);
}

export function isTriggeredByFormElement(e: KeyboardEvent) {
  return ["INPUT", "BUTTON", "TEXTAREA", "SELECT"].includes(
    (e.target as HTMLElement | null)?.nodeName ?? ""
  );
}

export function getViewportCorners(transform: Matrix, viewportSize: RRPoint) {
  const inverseTransform = inverse(transform);

  return [
    applyToPoint(inverseTransform, makePoint(0)),
    applyToPoint(inverseTransform, makePoint(0, viewportSize.y)),
    applyToPoint(inverseTransform, viewportSize),
    applyToPoint(inverseTransform, makePoint(viewportSize.x, 0)),
  ] as const;
}

export function linkify(text: string) {
  const matches = text.matchAll(/(^| )(https?:\/\/.+?)\.?(?: |$)/gim);

  const result = [];

  let i = 0;
  for (const match of matches) {
    const start = match.index! + match[1]!.length;
    const end = start + match[2]!.length;
    result.push(text.substring(i, start));
    const url = text.substring(start, end);
    result.push(
      <a href={url} target="_blank" rel="noreferrer">
        {url}
      </a>
    );
    i = end;
  }

  result.push(text.substring(i));

  return result.filter((each) => each !== "");
}
