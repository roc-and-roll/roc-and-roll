import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import rough from "roughjs/bin/rough";
import type {
  Drawable,
  OpSet,
  Options,
  ResolvedOptions,
} from "roughjs/bin/core";
import { RoughGenerator } from "roughjs/bin/generator";
import { RRPoint } from "../../shared/state";
import {
  pointAdd,
  pointNormalize,
  pointScale,
  pointSubtract,
  pointLeftRotate,
} from "../../shared/point";
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
import FontFaceObserver from "fontfaceobserver"; // cspell: disable-line

const DEFAULT_ROUGHNESS = 3;

const STROKE_WIDTH_SIMPLE = 4;

const EPSILON = 5;

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
      case "path": {
        if (options.stroke === "none") {
          return;
        }

        const strokeColor = colorValue(options.stroke);
        instance.lineStyle({
          color: strokeColor.color,
          alpha: strokeColor.alpha,
          width: options.strokeWidth,
        });

        // TODO
        // <path
        //   strokeDasharray={options.strokeLineDash?.join(" ").trim()}
        //   strokeDashoffset={options.strokeLineDashOffset}
        // />;
        break;
      }
      case "fillPath": {
        if (options.fill === "none") {
          return;
        }

        instance.lineStyle({ width: 0 });
        const fillColor = colorValue(options.fill!);
        instance.beginFill(fillColor.color, fillColor.alpha);
        // TODO
        // fillRule={
        //   drawable.shape === "curve" || drawable.shape === "polygon"
        //     ? "evenodd"
        //     : undefined
        break;
      }
      case "fillSketch": {
        if (options.fill === "none") {
          return;
        }

        let fillWeight = options.fillWeight;
        if (fillWeight < 0) {
          fillWeight = options.strokeWidth / 2;
        }
        const fillColor = colorValue(options.fill!);
        instance.lineStyle({
          color: fillColor.color,
          alpha: fillColor.alpha,
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
    hitArea: PIXI.IHitArea;
    drawable: Drawable;
    generator: RoughGenerator;
  } & Omit<Container, "x" | "y" | "interactiveChildren" | "hitArea"> &
    InteractiveComponent
>(function DrawablePrimitive(
  {
    drawable,
    generator,
    x,
    y,
    hitArea,
    children,
    interactive,
    click,
    mousedown,
    mouseup,
    ...props
  },
  ref
) {
  return (
    <Container
      {...props}
      x={x}
      y={y}
      ref={ref}
      interactive={interactive}
      interactiveChildren={false}
      click={click}
      mousedown={mousedown}
      mouseup={mouseup}
      rightdown={mousedown}
      rightup={mouseup}
      hitArea={hitArea}
    >
      {drawable.sets.map((drawing, i) => (
        <OpSetToPIXI key={i} opSet={drawing} options={drawable.options} />
      ))}
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
  generateHitArea: (customProps: C) => PIXI.IHitArea
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
        const hitArea = useMemo(
          () => generateHitArea(generatorProps as C),
          // eslint-disable-next-line react-hooks/exhaustive-deps
          [
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
              hitArea={hitArea}
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
          // TODO: Maybe support simple display mode again.
          return null;
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
  ({ w, h }) => {
    const perpendicular = pointNormalize(pointLeftRotate({ x: w, y: h }));
    const tl = pointScale(perpendicular, -0.5 * EPSILON);
    const tr = pointAdd(tl, { x: w, y: h });
    const br = pointAdd(tr, pointScale(perpendicular, EPSILON));
    const bl = pointSubtract(br, { x: w, y: h });

    return new PIXI.Polygon([tl, tr, br, bl]);
  }
);

export const RoughRectangle = makeRoughComponent<
  {
    w: number;
    h: number;
  },
  SVGRectElement
>(
  "RoughRectangle",
  (generator, { w, h }, options) => generator.rectangle(0, 0, w, h, options),
  ({ w, h }) =>
    new PIXI.Rectangle(w < 0 ? w : 0, h < 0 ? h : 0, Math.abs(w), Math.abs(h))
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
  ({ w, h }) => {
    return new PIXI.Ellipse(w / 2, h / 2, Math.abs(w) / 2, Math.abs(h) / 2);
  }
);

export const RoughCircle = makeRoughComponent<{ d: number }, SVGCircleElement>(
  "RoughCircle",
  (generator, { d }, options) => generator.circle(d / 2, d / 2, d, options),
  ({ d }) => {
    return new PIXI.Ellipse(d / 2, d / 2, Math.abs(d) / 2, Math.abs(d) / 2);
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
  ({ path }) => new PIXI.Rectangle(0, 0, 100, 100)
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
  ({ points }) => {
    const thickPoints: RRPoint[] = [];
    points = [{ x: 0, y: 0 }, ...points];

    for (let i = 0; i < points.length - 1; i++) {
      const point = points[i]!;
      const dir = pointSubtract(points[i + 1]!, point);
      const perpendicular = pointNormalize(pointLeftRotate(dir));
      const tl = pointAdd(pointScale(perpendicular, 0.5 * EPSILON), point);
      const tr = pointAdd(tl, dir);
      thickPoints.push(tl);
      thickPoints.push(tr);
    }

    for (let i = points.length - 1; i > 0; i--) {
      const point = points[i]!;
      const dir = pointSubtract(points[i - 1]!, point);
      const perpendicular = pointNormalize(pointLeftRotate(dir));
      const br = pointAdd(pointScale(perpendicular, 0.5 * EPSILON), point);
      const bl = pointAdd(br, dir);
      thickPoints.push(br);
      thickPoints.push(bl);
    }

    return new PIXI.Polygon(thickPoints);
  }
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
  ({ points }) => new PIXI.Polygon(points)
);

const fontObserver = new (class {
  private loaded = false;
  private observers = new Set<() => void>();

  constructor() {
    const fontFaceObserver = new FontFaceObserver("Architects Daughter");
    void fontFaceObserver
      .load(null, 60_000)
      .then(() => {
        this.loaded = true;
        this.observers.forEach((observer) => observer());
        this.observers.clear();
      })
      .catch((error) => console.error(error));
  }

  public onLoad(observer: () => void) {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  public isLoaded() {
    return this.loaded;
  }
})();

const RoughTextNonMemoized = React.forwardRef<
  PIXI.Text,
  RRPixiProps<PIXI.Text>
>(function RoughText({ style, ...props }, ref) {
  // We need to wait until the font is loaded, otherwise the text will be
  // rendered with a default font.
  const [fontLoaded, setFontLoaded] = useState(fontObserver.isLoaded());
  useEffect(() => {
    if (!fontLoaded) {
      const unsubscribe = fontObserver.onLoad(() => setFontLoaded(true));
      return () => {
        unsubscribe();
      };
    }
  }, [fontLoaded]);

  return fontLoaded ? (
    <Text
      ref={ref}
      style={
        style instanceof PIXI.TextStyle
          ? style
          : { fontFamily: ["'Architects Daughter'", "cursive"], ...style }
      }
      // TODO: Text is blurry when zooming -- thus we render it at 5x the
      // resolution here. There is probably a better way.
      resolution={5}
      {...props}
      // TODO
      // dominantBaseline="text-before-edge"
    />
  ) : null;
});

export const RoughText = React.memo(RoughTextNonMemoized);

export const roughTextFontFamily = ["'Architects Daughter'", "cursive"];
