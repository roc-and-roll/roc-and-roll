import React, { useCallback, useRef, useState } from "react";
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
import { useServerDispatch } from "../../state";
import { useLatest } from "../../useLatest";
import tinycolor from "tinycolor2";
import { useRecoilValue } from "recoil";
import { hoveredMapObjectsFamily } from "./Map";
import { assetFamily, selectedMapObjectsFamily } from "./recoil";
import { mapObjectUpdate } from "../../../shared/actions";
import { SmartIntegerInput } from "../ui/TextInput";
import { useMyProps } from "../../myself";
import { pointEquals } from "../../../shared/point";
import * as PIXI from "pixi.js";
import { PRectangle } from "./Primitives";
import { Container, PixiElement, Sprite } from "react-pixi-fiber";
import { assetUrl } from "../../files";

export const colorValue = (color: string) =>
  parseInt(tinycolor(color).toHex(), 16);

export type RRMouseEvent = {
  clientX: number;
  clientY: number;
  button: number;
};

const SELECTED_OR_HOVERED_STROKE_LINE_DASH = [GRID_SIZE / 10, GRID_SIZE / 10];

export const MapObjectThatIsNotAToken = React.memo<{
  object: Exclude<RRMapObject, RRToken | RRMapLink>;
  onStartMove: (object: RRMapObject, event: RRMouseEvent) => void;
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

  const myself = useMyProps("id", "isGM");

  const canControl =
    !object.locked &&
    canStartMoving &&
    (myself.isGM || object.playerId === myself.id);

  const onStartMoveRef = useLatest((e: RRMouseEvent) => {
    onStartMove(object, e);
  });

  const clickPositionRef = useRef<RRPoint>();

  const sharedProps = {
    x: object.position.x,
    y: object.position.y,
    cursor: canControl ? "move" : undefined,
    interactive: true,
    mousedown: useCallback(
      ({ data: { originalEvent: e } }: PIXI.InteractionEvent) => {
        const event = e as MouseEvent;
        if (canControl) {
          onStartMoveRef.current(event);
        }
        clickPositionRef.current = { x: event.clientX, y: event.clientY };
      },
      [onStartMoveRef, canControl]
    ),
    mouseup: useCallback(
      ({ data: { originalEvent: e } }: PIXI.InteractionEvent) => {
        const event = e as MouseEvent;
        if (
          event.button === 2 &&
          clickPositionRef.current &&
          pointEquals(clickPositionRef.current, {
            x: event.clientX,
            y: event.clientY,
          }) &&
          canControl
        ) {
          setEditorVisible(true);
        }
      },
      [canControl]
    ),
    fill: colorValue(
      isSelectedOrHovered
        ? object.color
        : tinycolor(object.color).setAlpha(0.3).toHexString()
    ),
    stroke: colorValue(object.color),
  };

  const content = () => {
    switch (object.type) {
      case "rectangle":
        return (
          <PRectangle
            {...sharedProps}
            width={object.size.x}
            height={object.size.y}
          />
        );
      default:
        return null;
      // case "ellipse":
      //   return (
      //     <PEllipse {...sharedProps} width={object.size.x} height={object.size.y} />
      //   );
      // case "freehand":
      //   return <RoughLinearPath {...sharedProps} points={object.points} />;
      // case "polygon":
      //   return <RoughPolygon {...sharedProps} points={object.points} />;
      // case "text": {
      //   const {
      //     fill: _1,
      //     stroke: _2,
      //     strokeLineDash: _3,
      //     seed: _4,
      //     ...textProps
      //   } = sharedProps;
      //   return (
      //     <RoughText {...textProps} fill={sharedProps.stroke}>
      //       {object.text}
      //     </RoughText>
      //   );
      // }
      case "image": {
        const { fill: _, stroke: _1, ...imageProps } = sharedProps;

        return <MapObjectImage object={object} {...imageProps} />;
      }
      // default:
      //   assertNever(object);
    }
  };

  return (
    // <Popover
    //   content={<ObjectEditOptions object={object} mapId={mapId} />}
    //   visible={editorVisible}
    //   onClickOutside={() => setEditorVisible(false)}
    //   interactive
    //   placement="right"
    // >
    <Container angle={object.rotation}>{content()}</Container>
    /* </Popover> */
  );
});

function MapObjectImage({
  object,
  ...rest
}: {
  object: RRMapDrawingImage;
  x: number;
  y: number;
} & Omit<PixiElement<Sprite>, "width" | "height" | "texture">) {
  const asset = useRecoilValue(assetFamily(object.imageAssetId));

  return asset?.type === "image" && asset.location.type === "local" ? (
    <Sprite
      {...rest}
      width={(asset.width / asset.height) * object.height}
      height={object.height}
      texture={PIXI.Texture.from(assetUrl(asset))}
    />
  ) : // <SVGBlurHashImage
  //   image={asset}
  //   width={(asset.width / asset.height) * object.height}
  //   height={object.height}
  //   {...rest}
  // />
  null;
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
