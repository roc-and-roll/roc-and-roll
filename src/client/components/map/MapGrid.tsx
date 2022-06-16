import React, { useContext, useMemo } from "react";
import { Matrix } from "transformation-matrix";
import { RRColor } from "../../../shared/state";
import { ViewPortSizeContext } from "./MapContainer";
import * as PIXI from "pixi.js";
import { PRectangle } from "./Primitives";
import { GRID_SIZE } from "../../../shared/constants";
import tinycolor from "tinycolor2";

export const MapGrid = React.memo<{
  transform: Matrix;
  color: RRColor;
}>(function MapGrid({ transform, color }) {
  const viewPortSize = useContext(ViewPortSizeContext);

  const filter = useMemo(() => {
    const rgba = tinycolor(color).toRgb();
    return new PIXI.Filter(
      undefined,
      `
//cspell: disable-next-line
precision mediump float;

uniform vec4 color;

uniform float scale;
uniform vec2 offset;

vec2 pitch = scale * ${GRID_SIZE}. * vec2(1.);

void main() {
  if (scale < .25) {
    pitch *= 10.;
  }

  vec2 coord = gl_FragCoord.xy - offset;

  if (mod(coord.x, pitch.x) < 1. ||
      mod(coord.y, pitch.y) < 1.) {
    gl_FragColor = color;
  } else {
    gl_FragColor = vec4(0.);
  }
}
  `,
      {
        //TODO: allow picking a color with transparency from color input
        color: [rgba.r / 0xff, rgba.g / 0xff, rgba.b / 0xff, 0.6],
        scale: transform.a,
        // The origin of the coordinate system used by the shader is at the
        // bottom left, but PIXI's origin is at the top left. In theory, we
        // should be able to specify `origin_upper_left` in the shader to fix
        // this inconsistency, but I couldn't get it to work. This is why the
        // y-coordinate here isn't just `transform.f`, and why we need the
        // viewport height.
        offset: [transform.e, -transform.f + viewPortSize.y],
      }
    );
  }, [color, transform.a, transform.e, transform.f, viewPortSize.y]);

  return (
    <PRectangle
      name="grid"
      x={-transform.e / transform.a}
      y={-transform.f / transform.a}
      width={viewPortSize.x / transform.a}
      height={viewPortSize.y / transform.a}
      filters={[filter]}
    />
  );
});
