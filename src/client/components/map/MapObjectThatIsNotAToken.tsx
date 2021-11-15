import React, {
  ImgHTMLAttributes,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
  GRID_SIZE,
} from "../../../shared/constants";
import {
  RRMapDrawingImage,
  RRMapID,
  RRMapLink,
  RRMapObject,
  RRPoint,
  RRToken,
} from "../../../shared/state";
import {
  RoughEllipse,
  RoughRectangle,
  RoughText,
  RoughLinearPath,
  RoughPolygon,
} from "../rough";
import { useServerDispatch } from "../../state";
import { useLatest } from "../../useLatest";
import tinycolor from "tinycolor2";
import { assertNever } from "../../../shared/util";
import { useRecoilValue } from "recoil";
import { hoveredMapObjectsFamily } from "./Map";
import { assetFamily, selectedMapObjectsFamily } from "./recoil";
import { Popover } from "../Popover";
import { mapObjectUpdate } from "../../../shared/actions";
import { SmartIntegerInput } from "../ui/TextInput";
import { SVGBlurHashImage } from "../blurhash/SVGBlurhashImage";
import { useMyProps } from "../../myself";

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

  const myself = useMyProps("id");

  const canControl =
    !object.locked && canStartMoving && object.playerId === myself.id;
  const style = useMemo(
    () => (canControl ? { cursor: "move" } : {}),
    [canControl]
  );

  const strokeLineDash = useMemo(
    () => (isSelectedOrHovered ? [GRID_SIZE / 10, GRID_SIZE / 10] : undefined),
    [isSelectedOrHovered]
  );

  const ref = useLatest({ object, onStartMove });
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      ref.current.onStartMove(ref.current.object, e);
    },
    [ref]
  );

  const clickPositionRef = useRef<RRPoint>({ x: 0, y: 0 });

  const sharedProps = {
    x: object.position.x,
    y: object.position.y,
    style,
    onMouseDown: (e: React.MouseEvent) => {
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
    seed: object.id,
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
          seed: _4,
          ...textProps
        } = sharedProps;
        return (
          <RoughText {...textProps} fill={sharedProps.stroke}>
            {object.text}
          </RoughText>
        );
      }
      case "image": {
        const {
          strokeLineDash: _1,
          seed: _2,
          fill: _3,
          stroke: _4,
          ...imageProps
        } = sharedProps;

        return <MapObjectImage object={object} {...imageProps} />;
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
      <g
        transform={`rotate(${object.rotation}, 0, 0)`}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      >
        {content()}
      </g>
    </Popover>
  );
});

function MapObjectImage({
  object,
  ...rest
}: {
  object: RRMapDrawingImage;
  x: number;
  y: number;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, "width" | "height" | "src">) {
  const asset = useRecoilValue(assetFamily(object.imageAssetId));

  return asset?.type === "image" && asset.location.type === "local" ? (
    <SVGBlurHashImage
      image={asset}
      width={(asset.width / asset.height) * object.height}
      height={object.height}
      {...rest}
    />
  ) : null;
}

function ObjectEditOptions({
  object,
  mapId,
}: {
  object: Exclude<RRMapObject, RRToken>;
  mapId: RRMapID;
}) {
  const dispatch = useServerDispatch();

  const extraPopupContent = () => {
    switch (object.type) {
      case "image":
        return <ImageEditOptions object={object} mapId={mapId} />;
      default:
        return null;
    }
  };

  return (
    <div onMouseDown={(e) => e.stopPropagation()}>
      <label>
        Visible to GM only:
        <input
          type="checkbox"
          checked={object.visibility === "gmOnly"}
          onChange={(e) =>
            dispatch({
              actions: [
                mapObjectUpdate(mapId, {
                  id: object.id,
                  changes: {
                    visibility: e.target.checked ? "gmOnly" : "everyone",
                  },
                }),
              ],
              optimisticKey: "visibility",
              syncToServerThrottle: 0,
            })
          }
        />
      </label>
      <label>
        Rotation
        <SmartIntegerInput
          min={-360}
          max={360}
          value={object.rotation}
          onChange={(rotation) =>
            dispatch({
              actions: [
                mapObjectUpdate(mapId, {
                  id: object.id,
                  changes: { rotation },
                }),
              ],
              optimisticKey: "rotation",
              syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
            })
          }
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
  const dispatch = useServerDispatch();

  return (
    <label>
      Height:
      <SmartIntegerInput
        value={object.height / GRID_SIZE}
        onChange={(height) =>
          dispatch({
            actions: [
              mapObjectUpdate(mapId, {
                id: object.id,
                changes: { height: height * GRID_SIZE },
              }),
            ],
            optimisticKey: "height",
            syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
          })
        }
      />
    </label>
  );
}
