import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import rough from "roughjs/bin/rough";
import type {
  Drawable,
  OpSet,
  Options,
  ResolvedOptions,
} from "roughjs/bin/core";
import { RoughGenerator } from "roughjs/bin/generator";
import { RRPoint } from "../../shared/state";
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
import {
  getLocalBoundingBoxForEllipse,
  getLocalBoundingBoxForFreehand,
  getLocalBoundingBoxForLine,
  getLocalBoundingBoxForPolygon,
  getLocalBoundingBoxForRectangle,
  getRotationCenterOfBoundingBox,
} from "./map/geometry/bounding-boxes";
import { PPrimitive } from "./map/Primitives";
import tinycolor from "tinycolor2";

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

        // TODO(pixi)
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

        // TODO(pixi)
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
    hitArea: PIXI.Rectangle | PIXI.Circle | PIXI.Ellipse | PIXI.Polygon;
    drawable: Drawable;
    generator: RoughGenerator;
  } & Omit<Container, "x" | "y" | "interactiveChildren" | "hitArea" | "pivot"> &
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
    rightclick,
    ...props
  },
  ref
) {
  const rotationCenter = getRotationCenterOfBoundingBox(hitArea);
  return (
    <Container
      {...props}
      x={x + rotationCenter.x}
      y={y + rotationCenter.y}
      pivot={rotationCenter}
      ref={ref}
      interactive={interactive}
      interactiveChildren={false}
      click={click}
      mousedown={mousedown}
      mouseup={mouseup}
      // TODO
      rightdown={mousedown}
      rightup={mouseup}
      rightclick={rightclick}
      hitArea={hitArea}
    >
      {drawable.sets.map((drawing, i) => (
        <OpSetToPIXI key={i} opSet={drawing} options={drawable.options} />
      ))}
    </Container>
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

interface PassedThroughSimpleOptions {
  fill: number;
  fillAlpha: number;
  stroke: number;
  strokeAlpha: number;
  strokeWidth: number;
}

interface RoughComponentProps
  extends PassedThroughRoughOptions,
    Pick<RRPixiProps<PIXI.Container>, "children" | "name" | "cursor"> {
  onClick?: (e: RRMouseEvent) => void;
  onMouseDown?: (e: RRMouseEvent) => void;
  onMouseUp?: (e: RRMouseEvent) => void;
  onContextMenu?: (e: RRMouseEvent) => void;
  x: number;
  y: number;
  angle?: number;
  seed?: string;
}

type RoughComponent<
  // C contains the props that are specific to this rough component, e.g., a
  // rectangle uses {w, h}, but a circle just uses {d}.
  C extends object
> = React.MemoExoticComponent<
  React.ForwardRefExoticComponent<
    React.PropsWithoutRef<RoughComponentProps & C> &
      React.RefAttributes<PIXI.Container>
  >
>;

// eslint-disable-next-line @typescript-eslint/ban-types
function makeRoughComponent<
  // C contains the props that are specific to this rough component, e.g., a
  // rectangle uses {w, h}, but a circle just uses {d}.
  C extends object
>(
  displayName: string,
  generateRough: (
    rc: RoughGenerator,
    customProps: C,
    options: PassedThroughRoughOptions & { seed: number }
  ) => Drawable,
  generateSimple: (
    instance: PIXI.Graphics,
    customProps: C,
    options: PassedThroughSimpleOptions
  ) => void,
  generateHitArea: (
    customProps: C
  ) => PIXI.Rectangle | PIXI.Circle | PIXI.Ellipse | PIXI.Polygon
) {
  const component = React.memo(
    React.forwardRef<PIXI.Container, RoughComponentProps & C>(
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
          angle,
          cursor,
          ...generatorProps
        } = props;

        const realSeed = useMemo(
          () =>
            // Watchout: seed should never be 0
            seed === undefined ? randomSeed() + 1 : hashString(seed),
          [seed]
        );
        const generateSimpleFunc = useCallback(
          (instance: PIXI.Graphics) => {
            const pixiFill = colorValue(tinycolor(fill));
            const pixiStroke = colorValue(tinycolor(stroke));
            return generateSimple(instance, generatorProps as C, {
              fill: pixiFill.color,
              fillAlpha: fill === "none" ? 0 : pixiFill.alpha,
              stroke: pixiStroke.color,
              strokeAlpha: pixiStroke.alpha,
              strokeWidth: strokeWidth ?? 2,
            });
          },
          [fill, generatorProps, stroke, strokeWidth]
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
              ref={ref}
              name={name}
              drawable={drawable}
              generator={generator}
              x={x}
              y={y}
              angle={angle}
              hitArea={hitArea}
              interactive
              cursor={cursor}
              click={rrToPixiHandler(onClick)}
              mousedown={rrToPixiHandler(onMouseDown)}
              mouseup={rrToPixiHandler(onMouseUp)}
              rightclick={rrToPixiHandler(onContextMenu)}
            >
              {children}
            </DrawablePrimitive>
          );
        } else {
          const rotationCenter = getRotationCenterOfBoundingBox(hitArea);
          return (
            <Container
              {...props}
              x={x + rotationCenter.x}
              y={y + rotationCenter.y}
              pivot={rotationCenter}
              ref={ref}
              interactive={true}
              interactiveChildren={false}
              click={rrToPixiHandler(onClick)}
              mousedown={rrToPixiHandler(onMouseDown)}
              mouseup={rrToPixiHandler(onMouseUp)}
              // TODO
              rightdown={rrToPixiHandler(onMouseDown)}
              rightup={rrToPixiHandler(onMouseUp)}
              rightclick={rrToPixiHandler(onContextMenu)}
              hitArea={hitArea}
            >
              <PPrimitive generator={generateSimpleFunc} />
            </Container>
          );
        }
      }
    )
  );

  component.displayName = displayName;
  return component;
}

function drawSimpleShape(
  instance: PIXI.Graphics,
  options: PassedThroughSimpleOptions,
  filled: boolean,
  shape: () => void
) {
  instance.beginFill(
    filled ? options.fill : 0x000000,
    filled ? options.fillAlpha : 0
  );
  if (options.strokeWidth) {
    instance.lineStyle(
      options.strokeWidth,
      options.stroke,
      options.strokeAlpha
    );
  }
  shape();
  instance.endFill();
}

interface RoughLineProps {
  w: number;
  h: number;
}
export const RoughLine: RoughComponent<RoughLineProps> =
  makeRoughComponent<RoughLineProps>(
    "RoughLine",
    (generator, { w, h }, options) => generator.line(0, 0, w, h, options),
    (instance, { w, h }, options) =>
      drawSimpleShape(instance, options, false, () => {
        instance.moveTo(0, 0);
        instance.lineTo(w, h);
      }),
    ({ w, h }) => getLocalBoundingBoxForLine(w, h, false)
  );

interface RoughRectangleProps {
  w: number;
  h: number;
}
export const RoughRectangle: RoughComponent<RoughRectangleProps> =
  makeRoughComponent<RoughRectangleProps>(
    "RoughRectangle",
    (generator, { w, h }, options) => generator.rectangle(0, 0, w, h, options),
    (instance, { w, h }, options) =>
      drawSimpleShape(instance, options, true, () =>
        instance.drawRect(0, 0, w, h)
      ),
    ({ w, h }) => getLocalBoundingBoxForRectangle(w, h)
  );

interface RoughEllipseProps {
  w: number;
  h: number;
}
export const RoughEllipse: RoughComponent<RoughEllipseProps> =
  makeRoughComponent<RoughEllipseProps>(
    "RoughEllipse",
    (generator, { w, h }, options) =>
      generator.ellipse(w / 2, h / 2, w, h, options),
    (instance, { w, h }, options) =>
      drawSimpleShape(instance, options, true, () =>
        instance.drawEllipse(w / 2, h / 2, w / 2, h / 2)
      ),
    ({ w, h }) => getLocalBoundingBoxForEllipse(w, h)
  );

interface RoughCircleProps {
  d: number;
}
export const RoughCircle: RoughComponent<RoughCircleProps> =
  makeRoughComponent<RoughCircleProps>(
    "RoughCircle",
    (generator, { d }, options) => generator.circle(d / 2, d / 2, d, options),
    (instance, { d }, options) =>
      drawSimpleShape(instance, options, true, () =>
        instance.drawCircle(d / 2, d / 2, d / 2)
      ),
    ({ d }) => getLocalBoundingBoxForEllipse(d, d)
  );

interface RoughLinearPathProps {
  points: RRPoint[];
}
export const RoughLinearPath: RoughComponent<RoughLinearPathProps> =
  makeRoughComponent<RoughLinearPathProps>(
    "RoughLinearPath",
    (generator, { points }, options) =>
      generator.linearPath(
        [[0, 0], ...points.map((each) => [each.x, each.y] as [number, number])],
        options
      ),
    (instance, { points }, options) =>
      drawSimpleShape(instance, options, false, () => {
        instance.moveTo(0, 0);
        for (let i = 0; i < points.length; i++) {
          instance.lineTo(points[i]!.x, points[i]!.y);
        }
      }),
    ({ points }) => getLocalBoundingBoxForFreehand(points, false)
  );

interface RoughPolygonProps {
  points: RRPoint[];
}
export const RoughPolygon: RoughComponent<RoughPolygonProps> =
  makeRoughComponent<RoughPolygonProps>(
    "RoughPolygon",
    (generator, { points }, options) =>
      generator.polygon(
        [[0, 0], ...points.map((each) => [each.x, each.y] as [number, number])],
        options
      ),
    (instance, { points }, options) => {
      drawSimpleShape(instance, options, true, () => {
        instance.moveTo(0, 0);
        for (let i = 0; i < points.length; i++) {
          instance.lineTo(points[i]!.x, points[i]!.y);
        }
        instance.closePath();
      });
    },
    ({ points }) => getLocalBoundingBoxForPolygon(points)
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
      // TODO(pixi): Text is blurry when zooming -- thus we render it at 5x the
      // resolution here. There is probably a better way.
      resolution={5}
      {...props}
    />
  ) : null;
});

export const RoughText = React.memo(RoughTextNonMemoized);

export const roughTextFontFamily = ["'Architects Daughter'", "cursive"];
