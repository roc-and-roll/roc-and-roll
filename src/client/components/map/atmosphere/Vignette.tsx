/*!
 * Adapted from:
 * @license MIT
 * Copyright (c) 2015 Samuel Giles
 * https://github.com/samgiles/pixi-vignette
 */

import { useContext, useEffect, useMemo } from "react";
import { RRPoint } from "../../../../shared/state";
import { lerp } from "../../../../shared/util";
import { PixiFilterContext } from "./Atmosphere";
import * as PIXI from "pixi.js";

const makeVignetteShader = () =>
  new PIXI.Filter(
    undefined,
    /*cspell:disable*/
    `
precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform float size;
uniform float amount;
uniform float focalPointX;
uniform float focalPointY;
void main() {
  vec4 rgba = texture2D(uSampler, vTextureCoord);
  vec3 rgb = rgba.xyz;
  float dist = distance(vTextureCoord, vec2(focalPointX, focalPointY));
  rgb *= smoothstep(0.8, size * 0.799, dist * (0.5 * amount + size));
  gl_FragColor = vec4(vec3(rgb), rgba.a);
}`,
    /*cspell:enable*/
    {
      amount: 1.5,
      size: 0.5,
      focalPointX: 0.5,
      focalPointY: 0.5,
    }
  );

export function Vignette({
  intensity,
  size,
}: {
  intensity: number;
  size: RRPoint;
}) {
  const { addFilter, removeFilter } = useContext(PixiFilterContext);
  const vignetteShader = useMemo(() => makeVignetteShader(), []);

  useEffect(() => {
    addFilter(vignetteShader);
    return () => removeFilter(vignetteShader);
  }, [addFilter, removeFilter, vignetteShader]);

  useEffect(() => {
    vignetteShader.uniforms["amount"] = lerp(1.5, 2.4, intensity);
  }, [intensity, vignetteShader.uniforms]);

  return null;
}
