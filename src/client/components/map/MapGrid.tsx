import React, { useContext, useEffect, useMemo } from "react";
import { Matrix } from "transformation-matrix";
import { RRColor } from "../../../shared/state";
import { ViewPortSizeContext } from "./MapContainer";
import * as PIXI from "pixi.js";
import { PRectangle } from "./Primitives";
import { GRID_SIZE } from "../../../shared/constants";
import tinycolor from "tinycolor2";
import { ARModeContext } from "../ar/ARMode";

const makeGridShader = () =>
  new PIXI.Filter(
    undefined,
    `
//cspell: disable-next-line
precision mediump float;

uniform vec4 color;

uniform float thickness;
uniform float scale;
uniform vec2 offset;

vec2 pitch = scale * ${GRID_SIZE}. * vec2(1.);

void main() {
  if (scale < .25) {
   pitch *= 10.;
  }

  vec2 coord = gl_FragCoord.xy - offset;

  if (mod(coord.x, pitch.x) < thickness ||
      mod(coord.y, pitch.y) < thickness) {
    gl_FragColor = color;
  } else {
    gl_FragColor = vec4(0.);
  }
}`,
    {
      color: [0, 0, 0, 0.6],
      scale: 1,
      offset: [0, 0],
      thickness: 1,
    }
  );

export const MapGrid = React.memo<{
  transform: Matrix;
  color: RRColor;
}>(function MapGrid({ transform, color }) {
  const viewPortSize = useContext(ViewPortSizeContext);
  const { enabled: arModeEnabled } = useContext(ARModeContext);

  const gridShader = useMemo(() => makeGridShader(), []);

  useEffect(() => {
    const rgba = tinycolor(color).toRgb();
    gridShader.uniforms["color"] = [
      rgba.r / 0xff,
      rgba.g / 0xff,
      rgba.b / 0xff,
      //TODO: allow picking a color with transparency from color input
      0.6,
    ];
  }, [gridShader, color]);

  useEffect(() => {
    gridShader.uniforms["scale"] = transform.a;
  }, [gridShader, transform.a]);

  useEffect(() => {
    gridShader.uniforms["offset"] = [
      transform.e,
      -transform.f + viewPortSize.y,
    ];
  }, [gridShader, transform.e, transform.f, viewPortSize.y]);

  useEffect(() => {
    gridShader.uniforms["thickness"] = arModeEnabled ? 5 : 1;
  }, [gridShader, arModeEnabled]);

  return (
    <PRectangle
      name="grid"
      x={-transform.e / transform.a}
      y={-transform.f / transform.a}
      width={viewPortSize.x / transform.a}
      height={viewPortSize.y / transform.a}
      filters={[gridShader]}
    />
  );
});
