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
import { Container, PixiElement, Sprite } from "react-pixi-fiber";
import { assetUrl, urlToLocalFile } from "../../files";
import { RRMouseEvent, rrToPixiHandler } from "./pixi-utils";
import {
  RoughEllipse,
  RoughLinearPath,
  RoughPolygon,
  RoughRectangle,
  RoughText,
} from "../rough";

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
    onMouseDown: useCallback(
      (event: RRMouseEvent) => {
        if (canControl) {
          onStartMoveRef.current(event);
        }
        clickPositionRef.current = { x: event.clientX, y: event.clientY };
      },
      [onStartMoveRef, canControl]
    ),
    onMouseUp: useCallback(
      (event: RRMouseEvent) => {
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
      default:
        return null;
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
            {...rest}
          />
        );
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
    <Container name={`${object.type}: ${object.id}`} angle={object.rotation}>
      {content()}
    </Container>
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

  if (!(asset?.type === "image" && asset.location.type === "local"))
    return null;

  if (asset.tilesBasePath) {
    const url = urlToLocalFile(asset.tilesBasePath);
    const rows = Math.ceil(asset.height / 256);
    const columns = Math.ceil(asset.width / 256);
    return (
      <Container {...rest}>
        {Array(rows)
          .fill(0)
          .flatMap((_, y) =>
            Array(columns)
              .fill(0)
              .flatMap((_, x) => (
                <Sprite
                  {...rest}
                  key={`${x}-${y}`}
                  width={256}
                  height={256}
                  x={x * 256}
                  y={y * 256}
                  texture={PIXI.Texture.from(
                    url
                      .replace("{x}", x.toString())
                      .replace("{y}", y.toString())
                  )}
                />
              ))
          )}
      </Container>
    );
  }

  return (
    <Sprite
      {...rest}
      width={(asset.width / asset.height) * object.height}
      height={object.height}
      texture={PIXI.Texture.from(assetUrl(asset))}
    />
  );
  // <SVGBlurHashImage
  //   image={asset}
  //   width={(asset.width / asset.height) * object.height}
  //   height={object.height}
  //   {...rest}
  // />
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
