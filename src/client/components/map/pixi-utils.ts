import { Matrix } from "transformation-matrix";
import * as PIXI from "pixi.js";
import tinycolor, { ColorInput } from "tinycolor2";
import { Key, ReactNode, ReactPortal } from "react";
import * as ReactIs from "react-is";
import { Container } from "react-pixi-fiber";
import { ReactPortal as ReactReconcilerPortal } from "react-reconciler";

export const matrixToPixiTransform = (m: Matrix) => {
  const t = new PIXI.Transform();
  t.setFromMatrix(new PIXI.Matrix(m.a, m.b, m.c, m.d, m.e, m.f));
  return t;
};

export const colorValue = (color: ColorInput) =>
  parseInt(tinycolor(color).toHex(), 16);

export type RRMouseEvent = {
  clientX: number;
  clientY: number;
  button: number;
};

// Based on code from https://github.com/facebook/react/issues/13048
// by Dan Abramov.                              cspell: disable-line
export function createPixiPortal(
  children: ReactNode,
  containerInfo: Container,
  key: Key | null = null
): ReactPortal {
  const portal: ReactReconcilerPortal = {
    $$typeof: ReactIs.Portal,
    key: key === null ? key : key.toString(),
    children,
    containerInfo,
    implementation: null,
  };
  return portal as unknown as ReactPortal;
}
