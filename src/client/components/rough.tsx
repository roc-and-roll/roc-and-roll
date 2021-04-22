import composeRefs from "@seznam/compose-react-refs";
import React, { SVGProps, useCallback, useContext, useState } from "react";
import type { RoughSVG } from "roughjs/bin/svg";
import rough from "roughjs/bin/rough";
import type { Drawable, Options } from "roughjs/bin/core";
import { RoughGenerator } from "roughjs/bin/generator";

export const RoughContext = React.createContext<{
  svg: SVGSVGElement;
  rc: RoughSVG;
} | null>(null);

RoughContext.displayName = "RoughContext";

export const RoughContextProvider = React.forwardRef<
  SVGSVGElement,
  React.PropsWithChildren<SVGProps<SVGElement>>
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

/**
 * Adapted from Rough.js
 * https://github.com/rough-stuff/rough/blob/bc460dd98eca1f6c4eb8104794931960f0b078ca/src/svg.ts
 *
 * @licensed under the MIT License
 * Copyright (c) 2019 Preet Shihn
 */
function DrawablePrimitive({ d, rc }: { d: Drawable; rc: RoughSVG }) {
  const options = d.options || rc.getDefaultOptions();

  return (
    <g>
      {d.sets.map((drawing, i) => {
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
                  d.shape === "curve" || d.shape === "polygon"
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

function makeRoughComponent<C extends Record<string, unknown>>(
  generate: (
    rc: RoughGenerator,
    customProps: C,
    options: PassedThroughOptions
  ) => Drawable
) {
  return React.memo<C & PassedThroughOptions>(
    ({ fill, fillStyle, stroke, ...props }) => {
      const ctx = useContext(RoughContext);
      if (!ctx) {
        return null;
      }

      const drawable = generate(ctx.rc.generator, props as C, {
        fill,
        fillStyle,
        stroke,
      });

      return <DrawablePrimitive d={drawable} rc={ctx.rc} />;
    }
  );
}

export const RoughLine = makeRoughComponent<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}>((generator, { x1, y1, x2, y2 }, options) =>
  generator.line(x1, y1, x2, y2, options)
);

export const RoughRectangle = makeRoughComponent<{
  x: number;
  y: number;
  w: number;
  h: number;
}>((generator, { x, y, w, h }, options) =>
  generator.rectangle(x, y, w, h, options)
);

export const RoughEllipse = makeRoughComponent<{
  x: number;
  y: number;
  w: number;
  h: number;
}>((generator, { x, y, w, h }, options) =>
  generator.ellipse(x + w / 2, y + h / 2, w, h, options)
);

export const RoughCircle = makeRoughComponent<{
  x: number;
  y: number;
  d: number;
}>((generator, { x, y, d }, options) =>
  generator.circle(x + d / 2, y + d / 2, d, options)
);

export const RoughPath = makeRoughComponent<{
  path: string;
}>((generator, { path }, options) => generator.path(path, options));
