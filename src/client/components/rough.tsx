import React, { SVGProps, useContext, useMemo } from "react";
import rough from "roughjs/bin/rough";
import type { Drawable, Options } from "roughjs/bin/core";
import { RoughGenerator } from "roughjs/bin/generator";
import clsx from "clsx";
import { RRPoint } from "../../shared/state";
import { makePoint } from "../point";

const DEFAULT_ROUGHNESS = 3;

// Stroke width used in simple mode.
const STROKE_WIDTH_SIMPLE = 5;

export const RoughContext = React.createContext<RoughGenerator | null>(null);

RoughContext.displayName = "RoughContext";

export function RoughContextProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () =>
      enabled
        ? rough.generator({
            options: {
              // outline
              strokeWidth: 3,
              // inside
              fillStyle: "hachure",
              hachureGap: 12,
              fillWeight: 3,
            },
          })
        : null,
    [enabled]
  );

  return (
    <RoughContext.Provider value={value}>{children}</RoughContext.Provider>
  );
}

/*!
 * Adapted from Rough.js
 * https://github.com/rough-stuff/rough/blob/bc460dd98eca1f6c4eb8104794931960f0b078ca/src/svg.ts
 *
 * @license MIT
 * Copyright (c) 2019 Preet Shihn
 */
function DrawablePrimitive({
  drawable,
  generator,
  x,
  y,
  ...props
}: {
  x: number;
  y: number;
  drawable: Drawable;
  generator: RoughGenerator;
} & SVGProps<SVGGElement>) {
  const options = drawable.options;

  return (
    <g {...props} transform={`translate(${x}, ${y})`}>
      {drawable.sets.map((drawing, i) => {
        switch (drawing.type) {
          case "path":
            return (
              <path
                key={i}
                d={generator.opsToPath(drawing)}
                stroke={options.stroke}
                strokeWidth={options.strokeWidth}
                fill="none"
                strokeDasharray={options.strokeLineDash?.join(" ").trim()}
                strokeDashoffset={options.strokeLineDashOffset}
              />
            );
          case "fillPath":
            return (
              <path
                key={i}
                d={generator.opsToPath(drawing)}
                stroke="none"
                strokeWidth={0}
                fill={options.fill}
                fillRule={
                  drawable.shape === "curve" || drawable.shape === "polygon"
                    ? "evenodd"
                    : undefined
                }
              />
            );
          case "fillSketch": {
            let fweight = options.fillWeight;
            if (fweight < 0) {
              fweight = options.strokeWidth / 2;
            }

            return (
              <path
                key={i}
                d={generator.opsToPath(drawing)}
                stroke={options.fill}
                strokeWidth={fweight}
                fill="none"
                strokeDasharray={options.fillLineDash?.join(" ").trim()}
                strokeDashoffset={options.fillLineDashOffset}
              />
            );
          }
        }
      })}
    </g>
  );
}

type PassedThroughOptions = Pick<
  Options,
  "fill" | "fillStyle" | "stroke" | "seed" | "strokeLineDash" | "roughness"
>;

// eslint-disable-next-line @typescript-eslint/ban-types
function makeRoughComponent<C extends object>(
  displayName: string,
  generateRough: (
    rc: RoughGenerator,
    customProps: C,
    options: PassedThroughOptions
  ) => Drawable,
  generateSimple: (
    customProps: C & {
      x: number;
      y: number;
      onMouseDown?: (e: React.MouseEvent<SVGElement>) => void;
    } & Pick<PassedThroughOptions, "fill" | "stroke" | "strokeLineDash">
  ) => React.ReactElement
) {
  const component = React.memo<
    C &
      PassedThroughOptions &
      Pick<SVGProps<SVGElement>, "onMouseDown" | "style"> & {
        x: number;
        y: number;
      }
  >(
    ({
      fill,
      fillStyle,
      stroke,
      strokeLineDash,
      seed,
      roughness,
      ...props
    }) => {
      const generator = useContext(RoughContext);
      const { style, onMouseDown, x, y, ...generatorProps } = props;
      const realSeed = useMemo(
        // seed must not be float for some reason.
        () =>
          seed === undefined || seed === 0
            ? Math.round(Math.random() * Number.MAX_SAFE_INTEGER)
            : seed,
        [seed]
      );
      const drawable = useMemo(
        () =>
          generator
            ? generateRough(generator, generatorProps as C, {
                fill,
                fillStyle,
                stroke,
                strokeLineDash,
                roughness: roughness ?? DEFAULT_ROUGHNESS,
                seed: realSeed,
              })
            : null,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
          generator,
          fill,
          fillStyle,
          stroke,
          strokeLineDash,
          roughness,
          realSeed,
          // TODO
          // eslint-disable-next-line react-hooks/exhaustive-deps
          ...Object.values(generatorProps),
        ]
      );

      if (generator) {
        if (!drawable) {
          return null;
        }

        return (
          <DrawablePrimitive
            drawable={drawable}
            generator={generator}
            x={x}
            y={y}
            onMouseDown={onMouseDown}
            style={style}
          />
        );
      } else {
        return generateSimple({
          x,
          y,
          onMouseDown,
          style,
          fill,
          stroke,
          strokeLineDash,
          strokeWidth: STROKE_WIDTH_SIMPLE,
          ...(generatorProps as C),
        });
      }
    }
  );

  component.displayName = displayName;
  return component;
}

export const RoughLine = makeRoughComponent<{
  w: number;
  h: number;
}>(
  "RoughLine",
  (generator, { w, h }, options) => generator.line(0, 0, w, h, options),
  ({ x, y, w, h, strokeLineDash: _, ...rest }) => (
    <line x1={x} y1={y} x2={x + w} y2={y + h} {...rest} />
  )
);

function correctNegativeSize({
  x,
  y,
  w,
  h,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  if (w < 0) {
    x = x + w;
    w = -w;
  }
  if (h < 0) {
    y = y + h;
    h = -h;
  }

  return { x, y, w, h };
}

export const RoughRectangle = makeRoughComponent<{
  w: number;
  h: number;
}>(
  "RoughRectangle",
  (generator, { w, h }, options) => generator.rectangle(0, 0, w, h, options),
  ({ x: ox, y: oy, w: ow, h: oh, strokeLineDash: _, ...rest }) => {
    const { x, y, w, h } = correctNegativeSize({ x: ox, y: oy, w: ow, h: oh });
    return <rect x={x} y={y} width={w} height={h} {...rest} />;
  }
);

export const RoughEllipse = makeRoughComponent<{
  w: number;
  h: number;
}>(
  "RoughEllipse",
  (generator, { w, h }, options) =>
    generator.ellipse(w / 2, h / 2, w, h, options),
  ({ x: ox, y: oy, w: ow, h: oh, strokeLineDash: _, ...rest }) => {
    const { x, y, w, h } = correctNegativeSize({ x: ox, y: oy, w: ow, h: oh });
    return (
      <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} {...rest} />
    );
  }
);

export const RoughCircle = makeRoughComponent<{
  d: number;
}>(
  "RoughCircle",
  (generator, { d }, options) => generator.circle(d / 2, d / 2, d, options),
  ({ x: ox, y: oy, d: od, strokeLineDash: _, ...rest }) => {
    const { x, y, w: d } = correctNegativeSize({ x: ox, y: oy, w: od, h: od });
    return <circle cx={x + d / 2} cy={y + d / 2} r={d / 2} {...rest} />;
  }
);

export const RoughSVGPath = makeRoughComponent<{
  path: string;
}>(
  "RoughSVGPath",
  (generator, { path }, options) => generator.path(path, options),
  ({ x, y, path, strokeLineDash: _, ...rest }) => (
    <path x={x} y={y} d={path} {...rest} />
  )
);

export const RoughLinearPath = makeRoughComponent<{
  points: RRPoint[];
}>(
  "RoughLinearPath",
  (generator, { points }, options) =>
    generator.linearPath(
      [[0, 0], ...points.map((each) => [each.x, each.y] as [number, number])],
      options
    ),
  ({ x, y, points, fill, strokeLineDash: _, ...rest }) => (
    <polyline
      fill="transparent"
      points={[makePoint(0), ...points]
        .map(({ x: px, y: py }) => `${x + px},${y + py}`)
        .join(" ")}
      {...rest}
    />
  )
);

export const RoughPolygon = makeRoughComponent<{
  points: RRPoint[];
}>(
  "RoughPolygon",
  (generator, { points }, options) =>
    generator.polygon(
      [[0, 0], ...points.map((each) => [each.x, each.y] as [number, number])],
      options
    ),
  ({ x, y, points, strokeLineDash: _, ...rest }) => (
    <polygon
      points={[makePoint(0), ...points]
        .map(({ x: px, y: py }) => `${x + px},${y + py}`)
        .join(" ")}
      {...rest}
    />
  )
);

// Rough.JS does not support text. We simply use a handwritten font to "fake"
// that look.
export const RoughText = React.memo<SVGProps<SVGTextElement>>(
  function RoughText({ children, x, y, ...props }) {
    return (
      <text
        x={x}
        y={y}
        dominantBaseline="text-before-edge"
        {...props}
        className={clsx("rough-text", props.className)}
      >
        {children}
      </text>
    );
  }
);
