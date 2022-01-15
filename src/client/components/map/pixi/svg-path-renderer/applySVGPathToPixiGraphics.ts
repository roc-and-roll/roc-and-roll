import * as PIXI from "pixi.js";
import { RRPoint } from "../../../../../shared/state";
import grammar from "./applySVGPathToPixiGraphics.peggy";

export function applySVGPathToPixiGraphics(
  graphics: PIXI.Graphics,
  path: string
) {
  grammar.parse(path, { handler: handler(graphics) });
}

function handler(graphics: PIXI.Graphics) {
  let position = { x: 0, y: 0 };
  let lastCubicControlPoint: RRPoint | null = null;

  const functions = {
    moveTo(c: "M" | "m", [first, ...pp]: [RRPoint, ...RRPoint[]]) {
      if (c === "M") {
        position = first;
      } else {
        position.x += first.x;
        position.y += first.y;
      }
      graphics.moveTo(position.x, position.y);
      lastCubicControlPoint = null;

      functions.lineTo(c === "M" ? "L" : "l", pp);
    },
    closePath() {
      graphics.closePath();
      lastCubicControlPoint = null;
    },
    lineTo(c: "L" | "l", pp: RRPoint[]) {
      for (const p of pp) {
        if (c === "L") {
          graphics.lineTo(p.x, p.y);
          position = p;
        } else {
          graphics.lineTo(position.x + p.x, position.y + p.y);
          position.x += p.x;
          position.y += p.y;
        }
      }
      lastCubicControlPoint = null;
    },
    horizontalLineTo(c: "H" | "h", pp: number[]) {
      for (const x of pp) {
        if (c === "H") {
          graphics.lineTo(x, position.y);
          position.x = x;
        } else {
          graphics.lineTo(position.x + x, position.y);
          position.x += x;
        }
      }
      lastCubicControlPoint = null;
    },
    verticalLineTo(c: "V" | "v", pp: number[]) {
      for (const y of pp) {
        if (c === "V") {
          graphics.lineTo(position.x, y);
          position.y = y;
        } else {
          graphics.lineTo(position.x, position.y + y);
          position.y += y;
        }
      }
      lastCubicControlPoint = null;
    },
    cubicCurveTo(c: "C" | "c", pp: [RRPoint, RRPoint, RRPoint][]) {
      for (const p of pp) {
        if (c === "C") {
          graphics.bezierCurveTo(
            p[0].x,
            p[0].y,
            p[1].x,
            p[1].y,
            p[2].x,
            p[2].y
          );
          lastCubicControlPoint = p[1];
          position = p[2];
        } else {
          graphics.bezierCurveTo(
            position.x + p[0].x,
            position.y + p[0].y,
            position.x + p[1].x,
            position.y + p[1].y,
            position.x + p[2].x,
            position.y + p[2].y
          );
          lastCubicControlPoint = {
            x: position.x + p[1].x,
            y: position.y + p[1].y,
          };
          position.x += p[2].x;
          position.y += p[2].y;
        }
      }
    },
    smoothCubicCurveTo(c: "S" | "s", pp: [RRPoint, RRPoint][]) {
      if (lastCubicControlPoint === null) {
        lastCubicControlPoint = position;
      }

      for (const p of pp) {
        const cp = reflectPoint(lastCubicControlPoint, position);
        if (c === "S") {
          graphics.bezierCurveTo(cp.x, cp.y, p[0].x, p[0].y, p[1].x, p[1].y);
          lastCubicControlPoint = p[0];
          position = p[1];
        } else {
          graphics.bezierCurveTo(
            cp.x,
            cp.y,
            position.x + p[0].x,
            position.y + p[0].y,
            position.x + p[1].x,
            position.y + p[1].y
          );
          lastCubicControlPoint = {
            x: position.x + p[0].x,
            y: position.y + p[0].y,
          };
          position.x += p[1].x;
          position.y += p[1].y;
        }
      }
    },
    quadraticCurveTo(c: "Q" | "q", pp: [RRPoint, RRPoint][]) {
      for (const p of pp) {
        if (c === "Q") {
          graphics.quadraticCurveTo(p[0].x, p[0].y, p[1].x, p[1].y);
          position = p[1];
        } else {
          graphics.quadraticCurveTo(
            position.x + p[0].x,
            position.y + p[0].y,
            position.x + p[1].x,
            position.y + p[1].y
          );
          position.x += p[1].x;
          position.y += p[1].y;
        }
      }
      lastCubicControlPoint = null;
    },
    smoothQuadraticCurveTo(c: "T" | "t", pp: unknown) {
      throw new Error(`SVG path commands of type ${c} are no yet supported`);
      lastCubicControlPoint = null;
    },
    ellipticalArc(
      cmd: "A" | "a",
      pp: [number, number, number, 1 | 0, 1 | 0, RRPoint][]
    ) {
      for (const [a, b, θInDegrees, largeArcFlag, sweepFlag, end] of pp) {
        // TODO: Properly handle out of range parameters
        // https://www.w3.org/TR/2018/CR-SVG2-20181004/paths.html#ArcOutOfRangeParameters

        const θ = (θInDegrees * Math.PI) / 180;
        const absoluteEnd =
          cmd === "A" ? end : { x: position.x + end.x, y: position.y + end.y };

        // TODO: The larger `theta` is, the worse the approximation is. We
        // should split the arc into multiple curves if `theta` is larger than
        // some threshold.
        const { q1, q2 } = getControlPointsForEllipticalArcApproximation({
          position,
          absoluteEnd,
          a,
          b,
          θ,
          largeArcFlag,
          sweepFlag,
        });

        graphics.bezierCurveTo(
          q1.x,
          q1.y,
          q2.x,
          q2.y,
          absoluteEnd.x,
          absoluteEnd.y
        );

        position = absoluteEnd;
      }

      lastCubicControlPoint = null;
    },
  };

  return functions;
}

/**
 * Mirrors a `point` across a `reflectionPoint`. Returns `reflectionPoint` if
 * `point` is `null`.
 */
function reflectPoint(
  point: RRPoint | null,
  reflectionPoint: RRPoint
): RRPoint {
  if (point === null) {
    return reflectionPoint;
  }
  return {
    x: point.x + 2 * (reflectionPoint.x - point.x),
    y: point.y + 2 * (reflectionPoint.y - point.y),
  };
}

/*!
 * cspell:disable
 *
 * @license This code is based on the equations from the following paper:
 * Maisonobe, L. "Drawing an elliptical arc using polylines, quadratic or cubic
 * Bézier curves." (2003)
 *
 * cspell:enable
 */
function getControlPointsForEllipticalArcApproximation({
  position,
  absoluteEnd,
  a,
  b,
  θ,
  largeArcFlag,
  sweepFlag,
}: {
  position: RRPoint;
  absoluteEnd: RRPoint;
  a: number;
  b: number;
  θ: number;
  largeArcFlag: 1 | 0;
  sweepFlag: 1 | 0;
}) {
  const {
    // c,
    θ1,
    θ2,
  } = endpointToCenter({
    start: position,
    end: absoluteEnd,
    largeArcFlag,
    sweepFlag,
    r: { x: a, y: b },
    θ: θ,
  });

  // section 2.2.1 parametric equation, page 5
  const η = (angle: number) => {
    return Math.atan2(Math.sin(angle) / b, Math.cos(angle) / a);
  };

  // equation 3, section 2.2.1 parametric equation, page 5
  // const E = (n: number) => {
  //   return {
  //     x: c.x + a * Math.cos(θ) * Math.cos(n) - b * Math.sin(θ) * Math.sin(n),
  //     y: c.y + a * Math.sin(θ) * Math.cos(n) + b * Math.cos(θ) * Math.sin(n),
  //   };
  // };

  // equation 4, section 2.2.1 parametric equation, page 5
  const E_ = (n: number) => {
    return {
      x: -a * Math.cos(θ) * Math.sin(n) - b * Math.sin(θ) * Math.cos(n),
      y: -a * Math.sin(θ) * Math.sin(n) + b * Math.cos(θ) * Math.cos(n),
    };
  };

  // section 3.4.1 control points choice, page 18
  const η1 = η(θ1);
  const η2 = η(θ2);
  const e1 = position; // === E(η1)
  const e2 = absoluteEnd; // === E(η2)
  const e_1 = E_(η1);
  const e_2 = E_(η2);
  const alpha =
    (Math.sin(η2 - η1) *
      (Math.sqrt(4 + 3 * Math.tan((η2 - η1) / 2) ** 2) - 1)) /
    3;

  return {
    q1: {
      x: e1.x + alpha * e_1.x,
      y: e1.y + alpha * e_1.y,
    },
    q2: {
      x: e2.x - alpha * e_2.x,
      y: e2.y - alpha * e_2.y,
    },
  };
}

/**
 * Calculates the angle between two vectors, `u` and `v`.
 */
function angleBetween(u: RRPoint, v: RRPoint): number {
  return (
    (Math.sign(u.x * v.y - u.y * v.x) || 1) *
    Math.acos(
      (u.x * v.x + u.y * v.y) / (Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y))
    )
  );
}

/*!
 * Converts an elliptic arc in endpoint representation to center representation.
 *
 * cspell:disable
 *
 * @license This code is based on the equations from section B.2.4 of the
 * Scalable Vector Graphics (SVG) 2 W3C Candidate Recommendation 04 October 2018
 * https://www.w3.org/TR/2018/CR-SVG2-20181004/implnote.html#ArcConversionEndpointToCenter
 *
 * Copyright © 2015 W3C® (MIT, ERCIM, Keio, Beihang).
 * This software or document includes material copied from or derived from
 * Scalable Vector Graphics (SVG) 2.
 * https://www.w3.org/Consortium/Legal/2015/doc-license
 *
 * cspell:enable
 */
function endpointToCenter({
  start: p1,
  end: p2,
  largeArcFlag,
  sweepFlag,
  r,
  θ,
}: {
  start: RRPoint;
  end: RRPoint;
  largeArcFlag: 1 | 0;
  sweepFlag: 1 | 0;
  r: RRPoint;
  θ: number;
}) {
  // Step 1: Compute (x1′, y1′), equation 5.1
  const temp1 = {
    x: (p1.x - p2.x) / 2,
    y: (p1.y - p2.y) / 2,
  };
  const p1_ = {
    x: +Math.cos(θ) * temp1.x + Math.sin(θ) * temp1.y,
    y: -Math.sin(θ) * temp1.x + Math.cos(θ) * temp1.y,
  };

  // Step 2: Compute (cx′, cy′), equation 5.2
  const temp2 = Math.sqrt(
    // TODO: This `Math.abs()` is not in the specification, but otherwise
    // faHandSparkles is not rendered correctly because the square root would be
    // a complex number.
    Math.abs(
      r.x ** 2 * r.y ** 2 - r.x ** 2 * p1_.y ** 2 - r.y ** 2 * p1_.x ** 2
    ) /
      (r.x ** 2 * p1_.y ** 2 + r.y ** 2 * p1_.x ** 2)
  );
  const c_ = {
    x: (largeArcFlag !== sweepFlag ? 1 : -1) * temp2 * ((+r.x * p1_.y) / r.y),
    y: (largeArcFlag !== sweepFlag ? 1 : -1) * temp2 * ((-r.y * p1_.x) / r.x),
  };

  // Step 3: Compute (cx, cy) from (cx′, cy′), equation 5.3
  // const temp3 = {
  //   x: (p1.x + p2.x) / 2,
  //   y: (p1.y + p2.y) / 2,
  // };
  // const c = {
  //   x: +Math.cos(θ) * c_.x - Math.sin(θ) * c_.y + temp3.x,
  //   y: +Math.sin(θ) * c_.x + Math.cos(θ) * c_.y + temp3.y,
  // };

  // Step 4: Compute θ1 and Δθ
  // equation 5.5
  const θ1 = angleBetween(
    { x: 1, y: 0 },
    { x: (p1_.x - c_.x) / r.x, y: (p1_.y - c_.y) / r.y }
  );
  // equation 5.6
  let Δθ =
    angleBetween(
      { x: (+p1_.x - c_.x) / r.x, y: (+p1_.y - c_.y) / r.y },
      { x: (-p1_.x - c_.x) / r.x, y: (-p1_.y - c_.y) / r.y }
    ) %
    (2 * Math.PI);

  if (sweepFlag === 0 && Δθ > 0) {
    Δθ -= 2 * Math.PI;
  } else if (sweepFlag === 1 && Δθ < 0) {
    Δθ += 2 * Math.PI;
  }

  return {
    // c,
    θ1,
    θ2: θ1 + Δθ,
  };
}
