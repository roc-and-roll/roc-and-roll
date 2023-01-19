declare module "react-lag-radar" {
  const component: import("react").ComponentType<{
    frames?: number;
    speed?: number;
    size?: number;
    inset?: number;
  }>;

  export = component;
}

declare module "perspective-transform" {
  type Point = [number, number];
  type Corners = readonly [...Point, ...Point, ...Point, ...Point];
  type Coefficients = readonly [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number
  ];

  // cspell: words coeffs

  const createTransform: (
    srcCorners: Corners,
    dstCorners: Corners
  ) => {
    transform: (x: number, y: number) => Point;
    transformInverse: (x: number, y: number) => Point;
    srtPts: readonly Corners;
    dstPts: readonly Corners;
    coeffs: readonly Coefficients;
    coeffsInv: readonly Coefficients;
  };

  export = createTransform;
}
