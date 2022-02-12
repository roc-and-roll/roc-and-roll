import React, { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import { RoughText, roughTextFontFamily } from "../../rough";
import { Container, InteractiveComponent } from "react-pixi-fiber";
import { createPixiPortal } from "../pixi-utils";
import { PRectangle } from "../Primitives";

const TEXT_STYLE = new PIXI.TextStyle({
  fill: 0xffffff,
  padding: 8,
  fontSize: 18,
  fontFamily: roughTextFontFamily,
});

const PADDING = { x: 8, y: 4 };

export function PixiTooltip({
  text,
  tooltipArea,
  children,
}: {
  text: string;
  tooltipArea: Container | null;
  children: React.ReactElement;
}) {
  const ref = useRef<InteractiveComponent & PIXI.DisplayObject>();
  const child = React.Children.only(children);

  const [tooltip, setTooltip] = useState<{
    box: PIXI.Rectangle;
  } | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const instance = ref.current;
    if (instance.interactive || instance.mouseover || instance.mouseout) {
      throw new Error("Not yet supported.");
    }
    instance.interactive = true;
    instance.mouseover = () => {
      const targetTopLeft = instance.getGlobalPosition();
      const targetBounds = instance.getBounds();
      const textBounds = PIXI.TextMetrics.measureText(text, TEXT_STYLE);
      const targetTopCenter = {
        x: targetTopLeft.x + targetBounds.width / 2,
        y: targetTopLeft.y - textBounds.height - 16,
      };
      if (targetBounds.height < 16 || targetBounds.width < 16) {
        return;
      }
      setTooltip({
        box: new PIXI.Rectangle(
          targetTopCenter.x - textBounds.width / 2,
          targetTopCenter.y,
          textBounds.width + 2,
          textBounds.height + 2
        ).pad(PADDING.x, PADDING.y),
      });
    };
    instance.mouseout = () => {
      setTooltip(null);
    };

    return () => {
      instance.interactive = false;
      instance.mouseover = undefined;
      instance.mouseout = undefined;
    };
  }, [text]);

  return (
    <>
      {tooltip &&
        tooltipArea &&
        createPixiPortal(
          <PRectangle
            x={tooltip.box.x}
            y={tooltip.box.y}
            width={tooltip.box.width}
            height={tooltip.box.height}
            alpha={0.8}
            fill={0x000000}
          >
            <RoughText
              x={PADDING.x}
              y={PADDING.y}
              style={TEXT_STYLE}
              text={text}
            />
          </PRectangle>,
          tooltipArea
        )}
      {React.cloneElement(child, { ref })}
    </>
  );
}
