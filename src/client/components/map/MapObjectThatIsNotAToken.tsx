import React, { useCallback, useMemo } from "react";
import { GRID_SIZE } from "../../../shared/constants";
import { RRMapLink, RRMapObject, RRToken } from "../../../shared/state";
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
import { useRecoilValue } from "recoil";
import { hoveredMapObjectsFamily } from "./Map";
import { selectedMapObjectsFamily } from "./MapContainer";

export const MapObjectThatIsNotAToken = React.memo<{
  object: Exclude<RRMapObject, RRToken | RRMapLink>;
  onStartMove: (object: RRMapObject, event: React.MouseEvent) => void;
  canStartMoving: boolean;
}>(function MapObjectThatIsNotAToken({ object, onStartMove, canStartMoving }) {
  const isHovered = useRecoilValue(hoveredMapObjectsFamily(object.id));
  const isSelected = useRecoilValue(selectedMapObjectsFamily(object.id));
  const isSelectedOrHovered = isHovered || isSelected;

  const myself = useMyself();

  const canControl =
    !object.locked && canStartMoving && object.playerId === myself.id;
  const style = useMemo(() => (canControl ? { cursor: "move" } : {}), [
    canControl,
  ]);

  const strokeLineDash = useMemo(
    () => (isSelectedOrHovered ? [GRID_SIZE / 10, GRID_SIZE / 10] : undefined),
    [isSelectedOrHovered]
  );

  const ref = useLatest({ object, onStartMove });
  const onMouseDown = useCallback(
    (e: React.MouseEvent<SVGElement>) => {
      ref.current.onStartMove(ref.current.object, e);
    },
    [ref]
  );

  const sharedProps = {
    x: object.position.x,
    y: object.position.y,
    style,
    onMouseDown: canControl ? onMouseDown : undefined,
    fill: isSelectedOrHovered
      ? object.color
      : tinycolor(object.color).setAlpha(0.3).toRgbString(),
    stroke: object.color,
    strokeLineDash,
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
});
