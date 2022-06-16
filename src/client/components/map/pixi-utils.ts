import * as PIXI from "pixi.js";
import tinycolor, { ColorInput } from "tinycolor2";
import { Key, ReactNode, ReactPortal } from "react";
import * as ReactIs from "react-is";
import { DisplayObjectProps, InteractiveComponent } from "react-pixi-fiber";
import { ReactPortal as ReactReconcilerPortal } from "react-reconciler";

export const colorValue = (color: ColorInput) => {
  const t = tinycolor(color);
  return { color: parseInt(t.toHex(), 16), alpha: t.getAlpha() };
};

export interface RRMouseEvent {
  clientX: number;
  clientY: number;
  button: number;
  shiftKey: boolean;
}

// Based on code from https://github.com/facebook/react/issues/13048
// by Dan Abramov.                              cspell: disable-line
export function createPixiPortal(
  children: ReactNode,
  containerInfo: PIXI.Container,
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

type RRHandler = (e: RRMouseEvent) => void;
type PixiHandler = (e: PIXI.InteractionEvent) => void;

const cache = new WeakMap<RRHandler, PixiHandler>();

// TODO: This should eventually be removed.
export function rrToPixiHandler(
  rrHandler?: RRHandler
): PixiHandler | undefined {
  if (rrHandler === undefined) {
    return undefined;
  }

  {
    const pixiHandler = cache.get(rrHandler);
    if (pixiHandler) {
      return pixiHandler;
    }
  }

  {
    const pixiHandler: PixiHandler = ({
      data: { originalEvent: e },
    }: PIXI.InteractionEvent) => rrHandler(e as MouseEvent);

    cache.set(rrHandler, pixiHandler);
    return pixiHandler;
  }
}

// react-pixi-fiber type definitions are super weird and don't play nicely when
// used with forwardRef. Use the below type instead.
export type RRPixiProps<T extends PIXI.DisplayObject> = DisplayObjectProps<T> &
  InteractiveComponent;
