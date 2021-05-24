import React, { useCallback, useMemo, useRef, useState } from "react";
import { GRID_SIZE } from "../../../shared/constants";
import {
  byId,
  RRMapDrawingImage,
  RRMapID,
  RRMapLink,
  RRMapObject,
  RRPoint,
  RRToken,
} from "../../../shared/state";
import { fileUrl } from "../../files";
import {
  RoughEllipse,
  RoughRectangle,
  RoughText,
  RoughLinearPath,
  RoughPolygon,
} from "../rough";
import { useLatest, useOptimisticDebouncedServerUpdate } from "../../state";
import tinycolor from "tinycolor2";
import { assertNever, withDo } from "../../../shared/util";
import { useMyself } from "../../myself";
import { useRecoilValue } from "recoil";
import { hoveredMapObjectsFamily } from "./Map";
import { selectedMapObjectsFamily } from "./MapContainer";
import { Popover } from "../Popover";
import { mapObjectUpdate } from "../../../shared/actions";

export const MapObjectThatIsNotAToken = React.memo<{
  object: Exclude<RRMapObject, RRToken | RRMapLink>;
  onStartMove: (object: RRMapObject, event: React.MouseEvent) => void;
  mapId: RRMapID;
  canStartMoving: boolean;
}>(function MapObjectThatIsNotAToken({
  object,
  onStartMove,
  canStartMoving,
  mapId,
}) {
  const isHovered = useRecoilValue(hoveredMapObjectsFamily(object.id));
  const isSelected = useRecoilValue(selectedMapObjectsFamily(object.id));
  const isSelectedOrHovered = isHovered || isSelected;

  const [editorVisible, setEditorVisible] = useState(false);

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

  const clickPositionRef = useRef<RRPoint>({ x: 0, y: 0 });

  const sharedProps = {
    x: object.position.x,
    y: object.position.y,
    style,
    onMouseDown: (e: React.MouseEvent<SVGElement>) => {
      canControl && onMouseDown(e);
      clickPositionRef.current = { x: e.clientX, y: e.clientY };
    },
    onMouseUp: (e: React.MouseEvent) =>
      e.button === 2 &&
      e.clientX === clickPositionRef.current.x &&
      e.clientY === clickPositionRef.current.y &&
      setEditorVisible(true),
    fill: isSelectedOrHovered
      ? object.color
      : tinycolor(object.color).setAlpha(0.3).toRgbString(),
    stroke: object.color,
    strokeLineDash,
  };

  const content = () => {
    switch (object.type) {
      case "rectangle":
        return (
          <RoughRectangle
            {...sharedProps}
            w={object.size.x}
            h={object.size.y}
          />
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
            width={
              (object.originalSize.x / object.originalSize.y) * object.height
            }
            height={object.height}
            href={fileUrl(object.image)}
          />
        );
      }
      default:
        assertNever(object);
    }
  };

  return (
    <Popover
      content={<ObjectEditOptions object={object} mapId={mapId} />}
      visible={editorVisible}
      onClickOutside={() => setEditorVisible(false)}
      interactive
      placement="right"
    >
      {content()}
    </Popover>
  );
});

function ObjectEditOptions({
  object,
  mapId,
}: {
  object: Exclude<RRMapObject, RRToken>;
  mapId: RRMapID;
}) {
  const extraPopupContent = () => {
    switch (object.type) {
      case "image":
        return <ImageEditOptions object={object} mapId={mapId} />;
      default:
        return <></>;
    }
  };

  const [hidden, setHidden] = useOptimisticDebouncedServerUpdate(
    (state) =>
      withDo(
        byId(state.maps.entities, mapId)?.objects.entities,
        (objects) =>
          objects &&
          withDo(
            byId(objects, object.id),
            (object) =>
              object &&
              object.type !== "token" &&
              object.visibility === "gmOnly"
          )
      ),
    (hidden) => {
      return mapObjectUpdate(mapId, {
        id: object.id,
        changes: { visibility: hidden ? "gmOnly" : "everyone" },
      });
    },
    100
  );

  return (
    <div onMouseDown={(e) => e.stopPropagation()}>
      <label>
        Visible to GM only:
        <input
          type="checkbox"
          checked={hidden}
          onChange={(e) => setHidden(e.target.checked)}
        />
      </label>
      {extraPopupContent()}
    </div>
  );
}

function ImageEditOptions({
  object,
  mapId,
}: {
  object: RRMapDrawingImage;
  mapId: RRMapID;
}) {
  const [height, setHeight] = useOptimisticDebouncedServerUpdate(
    (state) =>
      withDo(
        byId(state.maps.entities, mapId)?.objects.entities,
        (objects) =>
          objects &&
          withDo(
            byId(objects, object.id),
            (object) =>
              object &&
              ((object as RRMapDrawingImage).height / GRID_SIZE).toString()
          )
      ),
    (heightStr) => {
      const height = parseInt(heightStr ?? "");
      if (isNaN(height)) {
        return;
      }
      return mapObjectUpdate(mapId, {
        id: object.id,
        changes: { height: height * GRID_SIZE },
      });
    },
    100
  );

  return (
    <label>
      Height:
      <input
        type="number"
        value={height}
        onChange={(e) => setHeight(e.target.value)}
      />
    </label>
  );
}
