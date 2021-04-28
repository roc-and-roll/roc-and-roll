import React, { useCallback } from "react";
import { GRID_SIZE } from "../../../shared/constants";
import { RRMapObject, RRTokenOnMap } from "../../../shared/state";
import { fileUrl } from "../../files";
import {
  RoughEllipse,
  RoughRectangle,
  RoughText,
  RoughLinearPath,
  RoughPolygon,
} from "../rough";
import { useLatest } from "../../state";
import tinycolor from "tinycolor2";
import { assertNever } from "../../../shared/util";
import { useMyself } from "../../myself";

export function MapObjectThatIsNotAToken({
  object,
  onStartMove,
  selected,
  canStartMoving,
}: {
  object: Exclude<RRMapObject, RRTokenOnMap>;
  onStartMove: (event: React.MouseEvent) => void;
  selected: boolean;
  canStartMoving: boolean;
}) {
  const ref = useLatest(onStartMove);
  const myself = useMyself();

  const handleMouseDown = useCallback(
    (e) => {
      ref.current(e);
    },
    [ref]
  );

  const canControl = canStartMoving && object.playerId === myself.id;
  const style = canControl ? { cursor: "move" } : {};

  const sharedProps = {
    x: object.position.x,
    y: object.position.y,
    style,
    onMouseDown: handleMouseDown,
    fill: selected
      ? object.color
      : tinycolor(object.color).setAlpha(0.3).toRgbString(),
    stroke: object.color,
    strokeLineDash: selected ? [GRID_SIZE / 10, GRID_SIZE / 10] : undefined,
  };

  switch (object.type) {
    case "rectangle":
      return (
        <RoughRectangle {...sharedProps} w={object.size.x} h={object.size.y} />
      );
    case "ellipse":
      return (
        <RoughEllipse {...sharedProps} w={object.size.x} h={object.size.y} />
      );
    case "freehand":
      return <RoughLinearPath {...sharedProps} points={object.points} />;
    case "polygon":
      return <RoughPolygon {...sharedProps} points={object.points} />;
    case "text": {
      const {
        fill: _1,
        stroke: _2,
        strokeLineDash: _3,
        ...textProps
      } = sharedProps;
      return (
        <RoughText {...textProps} fill={sharedProps.stroke}>
          {object.text}
        </RoughText>
      );
    }
    case "image": {
      const { strokeLineDash: _, ...imageProps } = sharedProps;
      return (
        <image
          {...imageProps}
          width={object.size.x}
          height={object.size.y}
          href={fileUrl(object.image)}
        />
      );
    }
    default:
      assertNever(object);
  }
}
