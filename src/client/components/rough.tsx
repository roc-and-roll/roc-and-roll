import React, { SVGProps, useContext, useMemo } from "react";
import rough from "roughjs/bin/rough";
import type { Drawable, Options } from "roughjs/bin/core";
import { RoughGenerator } from "roughjs/bin/generator";
import clsx from "clsx";
import { RRPoint } from "../../shared/state";
import { makePoint } from "../../shared/point";
import { randomSeed } from "roughjs/bin/math";
import { hashString } from "../../shared/util";

const DEFAULT_ROUGHNESS = 3;

const STROKE_WIDTH_SIMPLE = 4;

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
const DrawablePrimitive = React.forwardRef<
  SVGGElement,
  {
    x: number;
    y: number;
    drawable: Drawable;
    generator: RoughGenerator;
  } & SVGProps<SVGGElement>
>(function DrawablePrimitive(
  { drawable, generator, x, y, children, ...props },
  ref
) {
  const options = drawable.options;

  return (
    <g {...props} transform={`translate(${x}, ${y})`} ref={ref}>
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
            let fillWeight = options.fillWeight;
            if (fillWeight < 0) {
              fillWeight = options.strokeWidth / 2;
            }

            return (
              <path
                key={i}
                d={generator.opsToPath(drawing)}
                stroke={options.fill}
                strokeWidth={fillWeight}
                fill="none"
                strokeDasharray={options.fillLineDash?.join(" ").trim()}
                strokeDashoffset={options.fillLineDashOffset}
              />
            );
          }
        }
      })}
      {children}
    </g>
  );
});

type PassedThroughRoughOptions = Pick<
  Options,
  | "fill"
  | "fillStyle"
  | "stroke"
  | "strokeWidth"
  | "strokeLineDash"
  | "roughness"
>;

interface RoughComponentProps
  extends PassedThroughRoughOptions,
    Pick<
      SVGProps<SVGElement>,
      | "onClick"
      | "onMouseDown"
      | "onMouseUp"
      | "onContextMenu"
      | "style"
      | "children"
    > {
  x: number;
  y: number;
  seed?: string;
}

type RoughComponent<
  // C contains the props that are specific to this rough component, e.g., a
  // rectangle uses {w, h}, but a circle just uses {d}.
  C extends object,
  // The type of the ref that is returned if the component is rendered in simple
  // mode.
  E extends SVGElement
> = React.MemoExoticComponent<
  React.ForwardRefExoticComponent<
    React.PropsWithoutRef<RoughComponentProps & C> &
      React.RefAttributes<E & SVGGElement>
  >
>;

// eslint-disable-next-line @typescript-eslint/ban-types
function makeRoughComponent<
  // C contains the props that are specific to this rough component, e.g., a
  // rectangle uses {w, h}, but a circle just uses {d}.
  C extends object,
  // The type of the ref that is returned if the component is rendered in simple
  // mode.
  E extends SVGElement
>(
  displayName: string,
  generateRough: (
    rc: RoughGenerator,
    customProps: C,
    options: PassedThroughRoughOptions & { seed: number }
  ) => Drawable,
  generateSimple: (
    customProps: C & {
      x: number;
      y: number;
      children?: React.ReactNode;
      onClick?: (e: React.MouseEvent<SVGElement>) => void;
      onMouseDown?: (e: React.MouseEvent<SVGElement>) => void;
      onMouseUp?: (e: React.MouseEvent<SVGElement>) => void;
      onContextMenu?: (e: React.MouseEvent<SVGElement>) => void;
    } & Pick<
        PassedThroughRoughOptions,
        "fill" | "stroke" | "strokeWidth" | "strokeLineDash"
      >,
    ref: React.ForwardedRef<E & SVGGElement>
  ) => React.ReactElement
): RoughComponent<C, E> {
  const component = React.memo(
    React.forwardRef<E & SVGGElement, RoughComponentProps & C>(
      (
        {
          fill,
          fillStyle,
          stroke,
          strokeWidth,
          strokeLineDash,
          seed,
          roughness,
          ...props
        },
        ref
      ) => {
        const generator = useContext(RoughContext);
        const {
          style,
          children,
          onClick,
          onMouseDown,
          onMouseUp,
          onContextMenu,
          x,
          y,
          ...generatorProps
        } = props;

        const realSeed = useMemo(
          () =>
            // Watchout: seed should never be 0
            seed === undefined ? randomSeed() + 1 : hashString(seed),
          [seed]
        );
        const drawable = useMemo(
          () =>
            generator
              ? generateRough(generator, generatorProps as C, {
                  fill,
                  fillStyle,
                  stroke,
                  strokeWidth:
                    strokeWidth ?? generator.defaultOptions.strokeWidth,
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
            strokeWidth,
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
              ref={ref}
              drawable={drawable}
              generator={generator}
              x={x}
              y={y}
              onClick={onClick}
              onMouseDown={onMouseDown}
              onMouseUp={onMouseUp}
              onContextMenu={onContextMenu}
              style={style}
            >
              {children}
            </DrawablePrimitive>
          );
        } else {
          return generateSimple(
            {
              x,
              y,
              children,
              onClick,
              onMouseDown,
              onMouseUp,
              onContextMenu,
              style,
              fill,
              stroke,
              strokeLineDash,
              strokeWidth: strokeWidth ?? STROKE_WIDTH_SIMPLE,
              ...(generatorProps as C),
            },
            ref
          );
        }
      }
    )
  );

  component.displayName = displayName;
  return component;
}

interface RoughLineProps {
  w: number;
  h: number;
}
export const RoughLine: RoughComponent<RoughLineProps, SVGLineElement> =
  makeRoughComponent<RoughLineProps, SVGLineElement>(
    "RoughLine",
    (generator, { w, h }, options) => generator.line(0, 0, w, h, options),
    ({ x, y, w, h, strokeLineDash: _, ...rest }, ref) => (
      <line x1={x} y1={y} x2={x + w} y2={y + h} ref={ref} {...rest} />
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

interface RoughRectangleProps {
  w: number;
  h: number;
}
export const RoughRectangle: RoughComponent<
  RoughRectangleProps,
  SVGRectElement
> = makeRoughComponent<RoughRectangleProps, SVGRectElement>(
  "RoughRectangle",
  (generator, { w, h }, options) => generator.rectangle(0, 0, w, h, options),
  ({ x: ox, y: oy, w: ow, h: oh, strokeLineDash: _, ...rest }, ref) => {
    const { x, y, w, h } = correctNegativeSize({ x: ox, y: oy, w: ow, h: oh });
    return <rect x={x} y={y} width={w} height={h} ref={ref} {...rest} />;
  }
);

interface RoughEllipseProps {
  w: number;
  h: number;
}
export const RoughEllipse: RoughComponent<
  RoughEllipseProps,
  SVGEllipseElement
> = makeRoughComponent<RoughEllipseProps, SVGEllipseElement>(
  "RoughEllipse",
  (generator, { w, h }, options) =>
    generator.ellipse(w / 2, h / 2, w, h, options),
  ({ x: ox, y: oy, w: ow, h: oh, strokeLineDash: _, ...rest }, ref) => {
    const { x, y, w, h } = correctNegativeSize({ x: ox, y: oy, w: ow, h: oh });
    return (
      <ellipse
        cx={x + w / 2}
        cy={y + h / 2}
        rx={w / 2}
        ry={h / 2}
        ref={ref}
        {...rest}
      />
    );
  }
);

interface RoughCircleProps {
  d: number;
}
export const RoughCircle: RoughComponent<RoughCircleProps, SVGCircleElement> =
  makeRoughComponent<{ d: number }, SVGCircleElement>(
    "RoughCircle",
    (generator, { d }, options) => generator.circle(d / 2, d / 2, d, options),
    ({ x: ox, y: oy, d: od, strokeLineDash: _, ...rest }, ref) => {
      const {
        x,
        y,
        w: d,
      } = correctNegativeSize({ x: ox, y: oy, w: od, h: od });
      return (
        <circle cx={x + d / 2} cy={y + d / 2} r={d / 2} ref={ref} {...rest} />
      );
    }
  );

interface RoughSVGPathProps {
  path: string;
}
export const RoughSVGPath: RoughComponent<RoughSVGPathProps, SVGPathElement> =
  makeRoughComponent<RoughSVGPathProps, SVGPathElement>(
    "RoughSVGPath",
    (generator, { path }, options) => generator.path(path, options),
    ({ x, y, path, strokeLineDash: _, ...rest }, ref) => (
      <path x={x} y={y} d={path} ref={ref} {...rest} />
    )
  );

interface RoughLinearPathProps {
  points: RRPoint[];
}
export const RoughLinearPath: RoughComponent<
  RoughLinearPathProps,
  SVGPolylineElement
> = makeRoughComponent<RoughLinearPathProps, SVGPolylineElement>(
  "RoughLinearPath",
  (generator, { points }, options) =>
    generator.linearPath(
      [[0, 0], ...points.map((each) => [each.x, each.y] as [number, number])],
      options
    ),
  ({ x, y, points, fill, strokeLineDash: _, ...rest }, ref) => (
    <polyline
      ref={ref}
      fill="transparent"
      points={[makePoint(0), ...points]
        .map(({ x: px, y: py }) => `${x + px},${y + py}`)
        .join(" ")}
      {...rest}
    />
  )
);

interface RoughPolygonProps {
  points: RRPoint[];
}
export const RoughPolygon: RoughComponent<
  RoughPolygonProps,
  SVGPolylineElement
> = makeRoughComponent<RoughPolygonProps, SVGPolygonElement>(
  "RoughPolygon",
  (generator, { points }, options) =>
    generator.polygon(
      [[0, 0], ...points.map((each) => [each.x, each.y] as [number, number])],
      options
    ),
  ({ x, y, points, strokeLineDash: _, ...rest }, ref) => (
    <polygon
      points={[makePoint(0), ...points]
        .map(({ x: px, y: py }) => `${x + px},${y + py}`)
        .join(" ")}
      ref={ref}
      {...rest}
    />
  )
);

// Rough.JS does not support text. We simply use a handwritten font to "fake"
// that look.
const RoughTextNonMemoized = React.forwardRef<
  SVGTextElement,
  SVGProps<SVGTextElement>
>(function RoughText({ children, x, y, ...props }, ref) {
  return (
    <text
      ref={ref}
      x={x}
      y={y}
      dominantBaseline="text-before-edge"
      {...props}
      className={clsx("rough-text", props.className)}
    >
      {children}
    </text>
  );
});

export const RoughText = React.memo(RoughTextNonMemoized);
