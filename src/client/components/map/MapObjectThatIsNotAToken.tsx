import React, { useCallback, useRef, useState } from "react";
import {
  DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
  GRID_SIZE,
  IMAGE_TILE_SIZE,
} from "../../../shared/constants";
import {
  RRMapDrawingImage,
  RRMapID,
  RRMapLink,
  RRMapObject,
  RRPoint,
  RRToken,
} from "../../../shared/state";
import * as PIXI from "pixi.js";
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
import { Container, PixiElement, Sprite } from "react-pixi-fiber";
import { assetUrl } from "../../files";
import { RRMouseEvent, rrToPixiHandler } from "./pixi-utils";
import {
  RoughEllipse,
  RoughLinearPath,
  RoughPolygon,
  RoughRectangle,
  RoughText,
} from "../rough";
import { PixiPopover } from "./pixi/PixiPopover";
import { assertNever } from "../../../shared/util";
import { PixiBlurHashSprite } from "../blurHash/PixiBlurHashSprite";

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
    name: `${object.type}: ${object.id}`,
    x: object.position.x,
    y: object.position.y,
    angle: object.rotation,
    cursor: canControl ? "move" : undefined,
    onMouseDown: useCallback(
      (e: RRMouseEvent) => {
        if (canControl && e.button === 0) {
          onStartMoveRef.current(e);
        }
        clickPositionRef.current = { x: e.clientX, y: e.clientY };
      },
      [onStartMoveRef, canControl]
    ),
    onMouseUp: useCallback(
      (e: RRMouseEvent) => {
        if (
          e.button === 2 &&
          clickPositionRef.current &&
          pointEquals(clickPositionRef.current, {
            x: e.clientX,
            y: e.clientY,
          }) &&
          canControl
        ) {
          setEditorVisible(true);
        }
      },
      [canControl]
    ),
    fill: isSelectedOrHovered
      ? object.color
      : tinycolor(object.color).setAlpha(0.3).toRgbString(),
    stroke: object.color,
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
          stroke: fill,
          onMouseDown,
          onMouseUp,
          // strokeLineDash: _3,
          // seed: _4,
          ...textProps
        } = sharedProps;
        return (
          <RoughText
            {...textProps}
            interactive
            mousedown={rrToPixiHandler(onMouseDown)}
            mouseup={rrToPixiHandler(onMouseUp)}
            rightdown={rrToPixiHandler(onMouseDown)}
            rightup={rrToPixiHandler(onMouseUp)}
            // Make sure to also adjust`getBoundingBoxForText` if you adjust the
            // style here!
            style={{ fill }}
            text={object.text}
          />
        );
      }
      case "image": {
        const {
          onMouseDown,
          onMouseUp,
          fill: _1,
          stroke: _2,
          // strokeLineDash: _3,
          // seed: _4,
          ...rest
        } = sharedProps;

        return (
          <MapObjectImage
            object={object}
            interactive
            mousedown={rrToPixiHandler(onMouseDown)}
            mouseup={rrToPixiHandler(onMouseUp)}
            rightdown={rrToPixiHandler(onMouseDown)}
            rightup={rrToPixiHandler(onMouseUp)}
            {...rest}
          />
        );
      }
      default:
        assertNever(object);
    }
  };

  return (
    <PixiPopover
      content={<ObjectEditOptions object={object} mapId={mapId} />}
      visible={editorVisible}
      onClickOutside={() => setEditorVisible(false)}
    >
      {content()}
    </PixiPopover>
  );
});

function MapObjectImage({
  object,
  x,
  y,
  ...rest
}: {
  object: RRMapDrawingImage;
  x: number;
  y: number;
} & Pick<
  PixiElement<Sprite>,
  | "name"
  | "mousedown"
  | "mouseup"
  | "rightdown"
  | "rightup"
  | "cursor"
  | "interactive"
  | "angle"
>) {
  const asset = useRecoilValue(assetFamily(object.imageAssetId));

  if (asset?.type !== "image" || asset.location.type !== "local") {
    return null;
  }

  const scaleFactor = object.height / asset.height;
  const width = asset.width * scaleFactor;
  const height = asset.height * scaleFactor;

  if (asset.width > 2048 || asset.height > 2048) {
    const filename = asset.location.filename;
    const rows = Math.ceil(asset.height / IMAGE_TILE_SIZE);
    const columns = Math.ceil(asset.width / IMAGE_TILE_SIZE);
    return (
      <>
        <Container
          hitArea={new PIXI.Rectangle(0, 0, width, height)}
          interactiveChildren={false}
          {...rest}
          x={x + width / 2}
          y={y + height / 2}
          pivot={{ x: width / 2, y: height / 2 }}
        >
          <PixiBlurHashSprite
            x={width / 2}
            y={height / 2}
            blurHashOnly
            width={width}
            height={height}
            blurHash={asset.blurHash}
            url={assetUrl(asset)}
          />
          {Array(rows)
            .fill(0)
            .flatMap((_, y) =>
              Array(columns)
                .fill(0)
                .map((_, x) => {
                  const w =
                    Math.min(
                      IMAGE_TILE_SIZE,
                      asset.width - x * IMAGE_TILE_SIZE
                    ) * scaleFactor;
                  const h =
                    Math.min(
                      IMAGE_TILE_SIZE,
                      asset.height - y * IMAGE_TILE_SIZE
                    ) * scaleFactor;
                  return (
                    <Sprite
                      key={`${x}-${y}`}
                      width={w}
                      height={h}
                      x={x * IMAGE_TILE_SIZE * scaleFactor}
                      y={y * IMAGE_TILE_SIZE * scaleFactor}
                      texture={PIXI.Texture.from(
                        `/api/files/cache/${encodeURIComponent(
                          filename
                        )}-tiles/0/${x}_${y}.jpeg`
                      )}
                    />
                  );
                })
            )}
        </Container>
      </>
    );
  }

  // This effectively sets the top left of the image to {x, y}, but applies
  // rotation to the center of the image.
  const positionProps = {
    x: x + width / 2,
    y: y + height / 2,
    width,
    height,
  };

  return (
    <PixiBlurHashSprite
      blurHash={asset.blurHash}
      url={assetUrl(asset)}
      {...positionProps}
      {...rest}
    />
  );
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
