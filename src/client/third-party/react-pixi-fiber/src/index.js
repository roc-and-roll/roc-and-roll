import CustomPIXIComponent, { CustomPIXIProperty } from "./CustomPIXIComponent";
import { AppContext, AppProvider, withApp } from "./AppProvider";
import Stage from "./Stage";
import { TYPES } from "./types";
import { usePixiApp, usePixiTicker } from "./hooks";
import { unstable_batchedUpdates } from "./ReactPixiFiber";
import { applyDisplayObjectProps } from "./ReactPixiFiberComponent";

/* Public API */

export {
  AppContext,
  AppProvider,
  CustomPIXIComponent,
  CustomPIXIProperty,
  Stage,
  applyDisplayObjectProps,
  withApp,
  usePixiApp,
  usePixiTicker,
  unstable_batchedUpdates,
};

export const BitmapText = TYPES.BITMAP_TEXT;
export const Container = TYPES.CONTAINER;
export const Graphics = TYPES.GRAPHICS;
export const NineSlicePlane = TYPES.NINE_SLICE_PLANE;
export const ParticleContainer = TYPES.PARTICLE_CONTAINER;
export const Sprite = TYPES.SPRITE;
export const Text = TYPES.TEXT;
export const TilingSprite = TYPES.TILING_SPRITE;
