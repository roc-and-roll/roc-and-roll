import composeRefs from "@seznam/compose-react-refs";
import React, {
  SVGProps,
  useCallback,
  useContext,
  useState,
  useMemo,
} from "react";
import type { RoughSVG } from "roughjs/bin/svg";
import rough from "roughjs/bin/rough";
import type { Drawable, Options } from "roughjs/bin/core";
import { RoughGenerator } from "roughjs/bin/generator";
import clsx from "clsx";

export const RoughContext = React.createContext<{
  svg: SVGSVGElement;
  rc: RoughSVG;
} | null>(null);

RoughContext.displayName = "RoughContext";

export const RoughContextProvider = React.forwardRef<
  SVGSVGElement,
  SVGProps<SVGElement>
>(function RoughContextProvider({ children, ...props }, forwardedRef) {
  const [roughSVG, setRoughSVG] = useState<{
    svg: SVGSVGElement;
    rc: RoughSVG;
  } | null>(null);
  const localRef = useCallback((svg: SVGSVGElement) => {
    setRoughSVG({
      svg,
      rc: rough.svg(svg, {
        options: {
          // outline
          strokeWidth: 3,
          // inside
          fillStyle: "hachure",
          hachureGap: 12,
          fillWeight: 3,
          // general options
          roughness: 3,
        },
      }),
    });
  }, []);

  const ref = composeRefs<SVGSVGElement>(localRef, forwardedRef);

  return (
    <RoughContext.Provider value={roughSVG}>
      <svg {...props} ref={ref}>
        {children}
      </svg>
    </RoughContext.Provider>
  );
});

/*!
 * Adapted from Rough.js
 * https://github.com/rough-stuff/rough/blob/bc460dd98eca1f6c4eb8104794931960f0b078ca/src/svg.ts
 *
 * @license MIT
 * Copyright (c) 2019 Preet Shihn
 */
function DrawablePrimitive({
  drawable,
  rc,
  x,
  y,
  ...props
}: {
  x: number;
  y: number;
  drawable: Drawable;
  rc: RoughSVG;
} & SVGProps<SVGGElement>) {
  const options = drawable.options || rc.getDefaultOptions();

  return (
    <g {...props} transform={`translate(${x}, ${y})`}>
      {drawable.sets.map((drawing, i) => {
        switch (drawing.type) {
          case "path":
            return (
              <path
                key={i}
                d={rc.opsToPath(drawing)}
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
                d={rc.opsToPath(drawing)}
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
                d={rc.opsToPath(drawing)}
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

type PassedThroughOptions = Pick<Options, "fill" | "fillStyle" | "stroke">;

// eslint-disable-next-line @typescript-eslint/ban-types
function makeRoughComponent<C extends object>(
  generate: (
    rc: RoughGenerator,
    customProps: C,
    options: PassedThroughOptions
  ) => Drawable
) {
  return React.memo<
    C &
      PassedThroughOptions &
      Pick<SVGProps<SVGGElement>, "onMouseDown"> & { x: number; y: number }
  >(({ fill, fillStyle, stroke, ...props }) => {
    const ctx = useContext(RoughContext);
    const { onMouseDown, x, y, ...generatorProps } = props;
    const drawable = useMemo(
      () =>
        ctx?.rc?.generator
          ? generate(ctx.rc.generator, generatorProps as C, {
              fill,
              fillStyle,
              stroke,
            })
          : null,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        ctx?.rc?.generator,
        fill,
        fillStyle,
        stroke,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        ...Object.values(generatorProps),
      ]
    );

    if (!drawable || !ctx) {
      return null;
    }

    return (
      <DrawablePrimitive
        drawable={drawable}
        rc={ctx.rc}
        x={x}
        y={y}
        onMouseDown={onMouseDown}
      />
    );
  });
}

export const RoughLine = makeRoughComponent<{
  x2: number;
  y2: number;
}>((generator, { x2, y2 }, options) => generator.line(0, 0, x2, y2, options));

export const RoughRectangle = makeRoughComponent<{
  w: number;
  h: number;
}>((generator, { w, h }, options) => generator.rectangle(0, 0, w, h, options));

export const RoughEllipse = makeRoughComponent<{
  w: number;
  h: number;
}>((generator, { w, h }, options) =>
  generator.ellipse(w / 2, h / 2, w, h, options)
);

export const RoughCircle = makeRoughComponent<{
  d: number;
}>((generator, { d }, options) => generator.circle(d / 2, d / 2, d, options));

export const RoughPath = makeRoughComponent<{
  path: string;
}>((generator, { path }, options) => generator.path(path, options));

// Rough.JS does not support text. We simply use a handwritten font to "fake"
// that look.
export function RoughText({ children, ...props }: SVGProps<SVGTextElement>) {
  return (
    <text {...props} className={clsx("rough-text", props.className)}>
      {children}
    </text>
  );
}
