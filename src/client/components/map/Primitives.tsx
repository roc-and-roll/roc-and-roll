import { CustomPIXIComponent } from "react-pixi-fiber";
import * as PIXI from "pixi.js";

export const PRectangle = CustomPIXIComponent<
  PIXI.Graphics,
  {
    fill: number;
    x: number;
    y: number;
    width: number;
    height: number;
    alpha?: number;
    stroke?: number;
    strokeWidth?: number;
  }
>(
  {
    customDisplayObject: (props) => new PIXI.Graphics(),
    customApplyProps: function (instance, oldProps, newProps) {
      const { fill, x, y, width, height, alpha, stroke, strokeWidth } =
        newProps;
      instance.clear();
      instance.beginFill(fill, alpha ?? 1);
      if (stroke) instance.lineStyle(strokeWidth ?? 1, stroke);
      instance.drawRect(x, y, width, height);
      instance.endFill();
    },
  },
  "Rectangle"
);

export const PCircle = CustomPIXIComponent<
  PIXI.Graphics,
  {
    cx: number;
    cy: number;
    r: number;
    fill: number;
    stroke: number;
    strokeWidth: number;
    alpha: number;
  }
>(
  {
    customDisplayObject: (props) => new PIXI.Graphics(),
    customApplyProps: function (instance, oldProps, newProps) {
      const { fill, cx, cy, r, stroke, strokeWidth, alpha } = newProps;
      instance.clear();
      instance.beginFill(fill, alpha);
      instance.lineStyle(strokeWidth, stroke);
      instance.drawCircle(cx, cy, r);
      instance.endFill();
    },
  },
  "Circle"
);
