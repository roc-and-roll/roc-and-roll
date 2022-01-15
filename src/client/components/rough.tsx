import React, { useContext, useEffect, useMemo, useRef } from "react";
import rough from "roughjs/bin/rough";
import type {
  Drawable,
  OpSet,
  Options,
  ResolvedOptions,
} from "roughjs/bin/core";
import { RoughGenerator } from "roughjs/bin/generator";
import { RRPoint } from "../../shared/state";
import { makePoint } from "../../shared/point";
import { randomSeed } from "roughjs/bin/math";
import { assertNever, hashString } from "../../shared/util";
import {
  Container,
  Graphics,
  InteractiveComponent,
  Text,
} from "react-pixi-fiber";
import * as PIXI from "pixi.js";
import {
  colorValue,
  RRMouseEvent,
  RRPixiProps,
  rrToPixiHandler,
} from "./map/pixi-utils";

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
 * https://github.com/rough-stuff/rough/blob/bc460dd98eca1f6c4eb8104794931960f0b078ca/src/canvas.ts
 *
 * @license MIT
 * Copyright (c) 2019 Preet Shihn
 */
function OpSetToPIXI({
  opSet,
  options,
}: {
  opSet: OpSet;
  options: ResolvedOptions;
}) {
  const ref = useRef<PIXI.Graphics>(null);

  useEffect(() => {
    const instance = ref.current;
    if (!instance) {
      return;
    }

    instance.clear();

    switch (opSet.type) {
      case "path":
        if (options.stroke === "none") {
          return;
        }

        instance.lineStyle({
          color: colorValue(options.stroke),
          width: options.strokeWidth,
        });

        // TODO
        // <path
        //   strokeDasharray={options.strokeLineDash?.join(" ").trim()}
        //   strokeDashoffset={options.strokeLineDashOffset}
        // />;
        break;
      case "fillPath":
        if (options.fill === "none") {
          return;
        }

        instance.lineStyle({ width: 0 });
        instance.beginFill(colorValue(options.fill!), 1);
        // TODO
        // fillRule={
        //   drawable.shape === "curve" || drawable.shape === "polygon"
        //     ? "evenodd"
        //     : undefined
        break;
      case "fillSketch": {
        if (options.fill === "none") {
          return;
        }

        let fillWeight = options.fillWeight;
        if (fillWeight < 0) {
          fillWeight = options.strokeWidth / 2;
        }
        instance.lineStyle({
          color: colorValue(options.fill!),
          width: fillWeight,
        });
        break;

        // TODO
        // <path
        //   strokeDasharray={options.fillLineDash?.join(" ").trim()}
        //   strokeDashoffset={options.fillLineDashOffset}
        // />;
      }
      default:
        assertNever(opSet.type);
    }

    for (const { op, data } of opSet.ops) {
      switch (op) {
        case "move":
          instance.moveTo(data[0]!, data[1]!);
          break;
        case "lineTo":
          instance.lineTo(data[0]!, data[1]!);
          break;
        case "bcurveTo": // cspell: disable-line
          instance.bezierCurveTo(
            data[0]!,
            data[1]!,
            data[2]!,
            data[3]!,
            data[4]!,
            data[5]!
          );
          break;
        default:
          assertNever(op);
      }
    }
    if (opSet.type === "fillPath") {
      instance.endFill();
    }
  }, [
    opSet,
    opSet.ops,
    opSet.type,
    options.fill,
    options.fillWeight,
    options.stroke,
    options.strokeLineDash,
    options.strokeLineDashOffset,
    options.strokeWidth,
  ]);

  return <Graphics ref={ref} />;
}

const DrawablePrimitive = React.forwardRef<
  PIXI.Container,
  {
    x: number;
    y: number;
    drawable: Drawable;
    generator: RoughGenerator;
  } & Omit<Container, "x" | "y" | "interactiveChildren" | "hitArea"> &
    InteractiveComponent
>(function DrawablePrimitive(
  { drawable, generator, x, y, children, ...props },
  ref
) {
  return (
    <Container
      {...props}
      // TODO: We need a better way to determine which area registers events.
      // TODO: This [1] suggests that it might be better to use `containsPoint`
      // [1] https://github.com/pixijs/pixijs/issues/6614
      hitArea={new PIXI.Rectangle(0, 0, 100, 100)}
      interactiveChildren={false}
      x={x}
      y={y}
      ref={ref}
    >
      {drawable.sets.map((drawing, i) => (
        <OpSetToPIXI key={i} opSet={drawing} options={drawable.options} />
      ))}
      {children}
    </Container>
  );
});

type PassedThroughOptions = Pick<
  Options,
  | "fill"
  | "fillStyle"
  | "stroke"
  | "strokeWidth"
  | "strokeLineDash"
  | "roughness"
>;

// eslint-disable-next-line @typescript-eslint/ban-types
function makeRoughComponent<C extends object, E extends SVGElement>(
  displayName: string,
  generateRough: (
    rc: RoughGenerator,
    customProps: C,
    options: PassedThroughOptions & { seed: number }
  ) => Drawable,
  generateSimple: (
    customProps: C & {
      name?: string;
      x: number;
      y: number;
      onClick?: (e: React.MouseEvent<SVGElement>) => void;
      children?: React.ReactNode;
      onMouseDown?: (e: React.MouseEvent<SVGElement>) => void;
      onMouseUp?: (e: React.MouseEvent<SVGElement>) => void;
      onContextMenu?: (e: React.MouseEvent<SVGElement>) => void;
    } & Pick<
        PassedThroughOptions,
        "fill" | "stroke" | "strokeWidth" | "strokeLineDash"
      >,
    ref: React.ForwardedRef<E>
  ) => React.ReactElement
) {
  const component = React.memo(
    React.forwardRef<
      E | SVGGElement,
      C &
        PassedThroughOptions & {
          onClick?: (e: RRMouseEvent) => void;
          onMouseDown?: (e: RRMouseEvent) => void;
          onMouseUp?: (e: RRMouseEvent) => void;
          onContextMenu?: (e: RRMouseEvent) => void;
        } & Pick<
          RRPixiProps<PIXI.Container>,
          "children" | "name" | "cursor"
        > & {
          x: number;
          y: number;
        } & {
          seed?: string;
        }
    >(
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
          name,
          children,
          onClick,
          onMouseDown,
          onMouseUp,
          onContextMenu,
          x,
          y,
          cursor,
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
              ref={ref as React.ForwardedRef<PIXI.Graphics>}
              name={name}
              drawable={drawable}
              generator={generator}
              x={x}
              y={y}
              interactive
              cursor={cursor}
              click={rrToPixiHandler(onClick)}
              mousedown={rrToPixiHandler(onMouseDown)}
              mouseup={rrToPixiHandler(onMouseUp)}
              // TODO
              // contextmenu={rrToPixiHandler(onContextMenu)}
            >
              {children}
            </DrawablePrimitive>
          );
        } else {
          return generateSimple(
            {
              name,
              x,
              y,
              children,
              onClick,
              onMouseDown,
              onMouseUp,
              onContextMenu,
              fill,
              stroke,
              strokeLineDash,
              strokeWidth: strokeWidth ?? STROKE_WIDTH_SIMPLE,
              ...(generatorProps as C),
            },
            ref as React.ForwardedRef<E>
          );
        }
      }
    )
  );

  component.displayName = displayName;
  return component;
}

export const RoughLine = makeRoughComponent<
  {
    w: number;
    h: number;
  },
  SVGLineElement
>(
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

export const RoughRectangle = makeRoughComponent<
  {
    w: number;
    h: number;
  },
  SVGRectElement
>(
  "RoughRectangle",
  (generator, { w, h }, options) => generator.rectangle(0, 0, w, h, options),
  ({ x: ox, y: oy, w: ow, h: oh, strokeLineDash: _, ...rest }, ref) => {
    const { x, y, w, h } = correctNegativeSize({ x: ox, y: oy, w: ow, h: oh });
    return <rect x={x} y={y} width={w} height={h} ref={ref} {...rest} />;
  }
);

export const RoughEllipse = makeRoughComponent<
  {
    w: number;
    h: number;
  },
  SVGEllipseElement
>(
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

export const RoughCircle = makeRoughComponent<{ d: number }, SVGCircleElement>(
  "RoughCircle",
  (generator, { d }, options) => generator.circle(d / 2, d / 2, d, options),
  ({ x: ox, y: oy, d: od, strokeLineDash: _, ...rest }, ref) => {
    const { x, y, w: d } = correctNegativeSize({ x: ox, y: oy, w: od, h: od });
    return (
      <circle cx={x + d / 2} cy={y + d / 2} r={d / 2} ref={ref} {...rest} />
    );
  }
);

export const RoughSVGPath = makeRoughComponent<
  {
    path: string;
  },
  SVGPathElement
>(
  "RoughSVGPath",
  (generator, { path }, options) => generator.path(path, options),
  ({ x, y, path, strokeLineDash: _, ...rest }, ref) => (
    <path x={x} y={y} d={path} ref={ref} {...rest} />
  )
);

export const RoughLinearPath = makeRoughComponent<
  {
    points: RRPoint[];
  },
  SVGPolylineElement
>(
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

export const RoughPolygon = makeRoughComponent<
  {
    points: RRPoint[];
  },
  SVGPolygonElement
>(
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

const RoughTextNonMemoized = React.forwardRef<
  PIXI.Text,
  RRPixiProps<PIXI.Text>
>(function RoughText({ style, ...props }, ref) {
  return (
    <Text
      ref={ref}
      style={{ fontFamily: ["Architects Daughter", "cursive"], ...style }}
      {...props}
      // TODO
      // dominantBaseline="text-before-edge"
    />
  );
});

export const RoughText = React.memo(RoughTextNonMemoized);
