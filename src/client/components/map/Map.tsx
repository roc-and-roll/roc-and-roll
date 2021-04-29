import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  scale,
  translate,
  compose,
  applyToPoint,
  Matrix,
  toSVG,
  inverse,
} from "transformation-matrix";
import { GRID_SIZE } from "../../../shared/constants";
import {
  byId,
  EntityCollection,
  entries,
  EphermalPlayer,
  RRColor,
  RRMapID,
  RRMapObject,
  RRMapObjectID,
  RRPlayer,
  RRPlayerID,
  RRPoint,
  RRTokenID,
  TokensSyncedState,
} from "../../../shared/state";
import { canControlMapObject } from "../../permissions";
import { ToolButtonState } from "./MapContainer";
import { RoughContextProvider, RoughRectangle } from "../rough";
import tinycolor from "tinycolor2";
import {
  makePoint,
  pointAdd,
  pointDistance,
  pointEquals,
  pointScale,
  pointSign,
  pointSubtract,
  snapPointToGrid,
} from "../../point";
import { MouseCursor } from "./MouseCursor";
import { MapMeasurePath } from "./MapMeasurePath";
import { MapMouseHandler } from "./CreateMapMouseHandler";
import { MapGrid } from "./MapGrid";
import { MapObjects } from "./MapObjects";
import { atom, atomFamily, useRecoilCallback } from "recoil";

type Rectangle = [number, number, number, number];

const PANNING_BUTTON = 2;
const TOOL_BUTTON = 0;

const ZOOM_SCALE_FACTOR = 0.2;

// sync the cursor position to the server in this interval
export const CURSOR_POSITION_SYNC_DEBOUNCE = 300;

// record the cursor position this many times between each sync to the server
export const CURSOR_POSITION_SYNC_HISTORY_STEPS = 10;

function mapObjectIntersectsWithRectangle(
  o: RRMapObject,
  { x, y, w, h }: { x: number; y: number; w: number; h: number }
) {
  // TODO: Currently assumes that every object is exactly GRID_SIZE big.
  return (
    o.position.x + GRID_SIZE >= x &&
    x + w >= o.position.x &&
    o.position.y + GRID_SIZE >= y &&
    y + h >= o.position.y
  );
}

enum MouseAction {
  NONE,
  PAN,
  SELECTION_AREA,
  MOVE_MAP_OBJECT,
  USE_TOOL,
}

export const globalToLocal = (transform: Matrix, p: RRPoint) => {
  const [x, y] = applyToPoint(inverse(transform), [p.x, p.y]);
  return { x, y };
};

export const hoveredObjectsFamily = atomFamily<boolean, RRMapObjectID>({
  key: "HoveredObject",
  default: false,
});

export const hoveredObjectIdsAtom = atom<RRMapObjectID[]>({
  key: "HoveredObjectIds",
  default: [],
});

const withSelectionAreaDo = <T extends any>(
  selectionArea: Rectangle | null,
  cb: (x: number, y: number, w: number, h: number) => T,
  otherwise: T | (() => T)
): T => {
  if (!selectionArea)
    return typeof otherwise === "function"
      ? (otherwise as () => T)()
      : otherwise;

  const left = Math.min(selectionArea[0], selectionArea[2]);
  const right = Math.max(selectionArea[0], selectionArea[2]);
  const top = Math.min(selectionArea[1], selectionArea[3]);
  const bottom = Math.max(selectionArea[1], selectionArea[3]);
  return cb(left, top, right - left, bottom - top);
};

export const RRMapView: React.FC<{
  myself: RRPlayer;
  mapObjects: RRMapObject[];
  mapId: RRMapID;
  gridEnabled: boolean;
  backgroundColor: RRColor;
  tokens: TokensSyncedState;
  selectedObjects: RRMapObjectID[];
  transform: Matrix;
  setTransform: React.Dispatch<React.SetStateAction<Matrix>>;
  onMoveMapObjects: (d: RRPoint) => void;
  onSelectObjects: (ids: RRMapObjectID[]) => void;
  onSetHP: (tokenId: RRTokenID, hp: number) => void;
  handleKeyDown: (event: KeyboardEvent) => void;
  players: EntityCollection<EphermalPlayer>;
  playerData: Map<RRPlayerID, { name: string; color: string; mapId: RRMapID }>;
  onUpdateTokenPath: (path: RRPoint[]) => void;
  onMousePositionChanged: (position: RRPoint) => void;
  toolHandler: MapMouseHandler;
  toolButtonState: ToolButtonState;
}> = ({
  myself,
  mapObjects,
  mapId,
  gridEnabled,
  backgroundColor,
  selectedObjects: selectedObjectIds,
  onSelectObjects,
  onSetHP,
  handleKeyDown,
  onMoveMapObjects,
  tokens,
  setTransform,
  transform,
  players,
  onUpdateTokenPath,
  onMousePositionChanged,
  toolButtonState,
  toolHandler,
  playerData,
}) => {
  const contrastColor = useMemo(
    () =>
      tinycolor.mostReadable(backgroundColor, ["#fff", "#000"]).toHexString(),
    [backgroundColor]
  );

  // TODO can't handle overlapping clicks
  const [mouseAction, setMouseAction] = useState<MouseAction>(MouseAction.NONE);

  const [dragStartID, setDragStartID] = useState<RRMapObjectID | null>(null);
  const dragLastMouseRef = useRef<RRPoint>({
    x: 0,
    y: 0,
  });

  const [selectionArea, setSelectionArea] = useState<Rectangle | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  const localCoords = (e: MouseEvent | React.MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (mouseAction !== MouseAction.NONE) return;

      const { x, y } = localCoords(e);
      setTransform((t) => {
        // debugger;
        // https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent/deltaMode
        const delta =
          e.deltaMode === 0x00 // pixel mode
            ? (e.deltaY / 100) * 16 * ZOOM_SCALE_FACTOR
            : e.deltaMode === 0x01 // line mode
            ? e.deltaY
            : // weird page mode
              3;

        return compose(
          translate(x, y),
          scale(Math.pow(1.05, -delta)),
          translate(-x, -y),
          t
        );
      });
    },
    [mouseAction, setTransform]
  );

  const addPointToPath = useCallback(
    (p: RRPoint) => {
      const path = byId<EphermalPlayer>(players.entities, myself.id)!.tokenPath;
      const gridPosition = pointScale(snapPointToGrid(p), 1 / GRID_SIZE);
      if (path.length < 1) return onUpdateTokenPath([gridPosition]);

      // to make moving along a diagonal easier, we only count hits that are not on the corners
      const radius = GRID_SIZE * 0.4;
      const isInCenter =
        pointDistance(
          pointScale(pointAdd(gridPosition, makePoint(0.5)), GRID_SIZE),
          p
        ) < radius;

      const pointsToReach = (from: RRPoint, to: RRPoint) => {
        const points: RRPoint[] = [];
        while (!pointEquals(from, to)) {
          const step = pointSign(pointSubtract(to, from));
          from = pointAdd(from, step);
          points.push(from);
        }
        return points;
      };

      if (
        isInCenter &&
        (path.length < 1 || !pointEquals(path[path.length - 1]!, gridPosition))
      ) {
        if (
          path.length > 1 &&
          pointEquals(path[path.length - 2]!, gridPosition)
        ) {
          onUpdateTokenPath(path.slice(0, path.length - 1));
        } else {
          onUpdateTokenPath([
            ...path,
            ...pointsToReach(path[path.length - 1]!, gridPosition),
          ]);
        }
      }
    },
    [myself.id, onUpdateTokenPath, players]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const { x, y } = localCoords(e);
      const frameDelta = {
        // we must not use dragLastMouse here, because it might not have
        // updated to reflect the value set during the last frame (since React
        // can batch multiple setState() calls, particularly if the browser is
        // very busy).
        // Instead use the ref, which is guranteed to have been updated.
        x: x - dragLastMouseRef.current.x,
        y: y - dragLastMouseRef.current.y,
      };

      switch (mouseAction) {
        case MouseAction.PAN: {
          setTransform((t) =>
            compose(translate(frameDelta.x, frameDelta.y), t)
          );
          break;
        }
        case MouseAction.SELECTION_AREA: {
          const innerLocal = globalToLocal(transform, { x, y });
          setSelectionArea(
            (a) => a && [a[0], a[1], innerLocal.x, innerLocal.y]
          );
          break;
        }
        case MouseAction.MOVE_MAP_OBJECT: {
          // TODO consider actual bounding box
          const innerLocal = pointAdd(
            mapObjects.find((o) => o.id === dragStartID)!.position,
            makePoint(GRID_SIZE * 0.5)
          );
          addPointToPath(innerLocal);
          onMoveMapObjects(pointScale(frameDelta, 1 / transform.a));
          break;
        }
        case MouseAction.USE_TOOL: {
          toolHandler.onMouseMove(globalToLocal(transform, { x, y }));
          break;
        }
      }

      if (mouseAction !== MouseAction.NONE) {
        dragLastMouseRef.current = { x, y };
      }
    },
    [
      mouseAction,
      setTransform,
      transform,
      setSelectionArea,
      mapObjects,
      addPointToPath,
      onMoveMapObjects,
      dragStartID,
      toolHandler,
    ]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    (document.activeElement as HTMLElement)?.blur();
    e.preventDefault();
    e.stopPropagation();
    const newMouseAction =
      e.button === PANNING_BUTTON
        ? MouseAction.PAN
        : e.button === TOOL_BUTTON
        ? toolButtonState === "select"
          ? MouseAction.SELECTION_AREA
          : MouseAction.USE_TOOL
        : MouseAction.NONE;

    setMouseAction(newMouseAction);

    const local = localCoords(e);
    dragLastMouseRef.current = local;

    const innerLocal = globalToLocal(transform, local);
    if (newMouseAction === MouseAction.SELECTION_AREA) {
      setSelectionArea([
        innerLocal.x,
        innerLocal.y,
        innerLocal.x,
        innerLocal.y,
      ]);
    } else if (newMouseAction === MouseAction.USE_TOOL) {
      toolHandler.onMouseDown(innerLocal);
    }
  };

  const updateHoveredObjects = useRecoilCallback(
    ({ snapshot, set, reset }) => (selectionArea: Rectangle | null) => {
      const lastHoveredObjectIds = snapshot
        .getLoadable(hoveredObjectIdsAtom)
        .getValue();

      withSelectionAreaDo<void>(
        selectionArea,
        (x, y, w, h) => {
          lastHoveredObjectIds.forEach((hoveredObjectId) =>
            reset(hoveredObjectsFamily(hoveredObjectId))
          );
          const hoveredMapObjectIds = mapObjects
            .filter(
              (mapObject) =>
                canControlMapObject(mapObject, myself) &&
                mapObjectIntersectsWithRectangle(mapObject, { x, y, w, h })
            )
            .map((each) => each.id);

          hoveredMapObjectIds.forEach((mapObjectId) => {
            set(hoveredObjectsFamily(mapObjectId), true);
          });
          set(
            hoveredObjectIdsAtom,
            hoveredMapObjectIds.map((each) => each)
          );
        },
        () => {
          lastHoveredObjectIds.forEach((mapObjectId) =>
            reset(hoveredObjectsFamily(mapObjectId))
          );
          set(hoveredObjectIdsAtom, []);
        }
      );
    },
    [mapObjects, myself]
  );

  useEffect(() => {
    updateHoveredObjects(selectionArea);
  }, [updateHoveredObjects, selectionArea]);

  const handleMouseUp = useRecoilCallback(
    ({ snapshot }) => (e: MouseEvent) => {
      setMouseAction(MouseAction.NONE);

      if (mouseAction === MouseAction.MOVE_MAP_OBJECT) {
        onUpdateTokenPath([]);
        setDragStartID(null);
      }
      if (mouseAction === MouseAction.SELECTION_AREA) {
        const lastHoveredObjectIds = snapshot
          .getLoadable(hoveredObjectIdsAtom)
          .getValue()
          .filter(Boolean);
        onSelectObjects(lastHoveredObjectIds);
        setSelectionArea(null);
      }
      if (mouseAction === MouseAction.USE_TOOL) {
        toolHandler.onMouseUp(globalToLocal(transform, localCoords(e)));
      }
    },
    [mouseAction, onUpdateTokenPath, onSelectObjects, toolHandler, transform]
  );

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("keydown", handleKeyDown);
    const svg = svgRef.current;
    svg?.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("keydown", handleKeyDown);
      svg?.removeEventListener("wheel", handleWheel);
    };
  }, [handleMouseMove, handleWheel, handleMouseUp, handleKeyDown]);

  const handleMapMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      onMousePositionChanged(globalToLocal(transform, localCoords(e)));
    },
    [onMousePositionChanged, transform]
  );

  const handleStartMoveMapObject = useCallback(
    (object: RRMapObject, event: React.MouseEvent) => {
      if (toolButtonState === "select" && canControlMapObject(object, myself)) {
        const local = localCoords(event);

        (document.activeElement as HTMLElement)?.blur();
        event.preventDefault();
        event.stopPropagation();
        setDragStartID(object.id);
        dragLastMouseRef.current = local;
        if (!selectedObjectIds.includes(object.id)) {
          onSelectObjects([object.id]);
        }
        setMouseAction(MouseAction.MOVE_MAP_OBJECT);
      }
    },
    [myself, onSelectObjects, selectedObjectIds, toolButtonState]
  );

  /* FIXME: doesn't actually feel that good. might have to do it only after we really
            drag and not just select.
  // we snap tokens to the cursor to make it easier for the user to aim diagonals
  useEffect(() => {
    if (dragStartID != null) {
      const object = mapObjects.find((o) => o.id === dragStartID)!;
      if (object.type === "token") {
        const innerLocal = globalToLocal(transform, dragLastMouseRef.current);
        const delta = pointSubtract(
          innerLocal,
          mapObjectCenter(object, tokens)
        );
        onMoveMapObjects(delta.x, delta.y);
      }
    }
  }, [
    dragLastMouseRef,
    dragStartID,
    mapObjects,
    mapObjects.entries,
    onMoveMapObjects,
    tokens,
    transform,
  ]);
  */

  const mapStyle = {
    backgroundColor,
    cursor: toolButtonState === "tool" ? "crosshair" : "inherit",
  };

  return (
    <RoughContextProvider>
      <svg
        ref={svgRef}
        className="map-svg"
        onContextMenu={(e) => e.preventDefault()}
        onMouseDown={handleMouseDown}
        style={mapStyle}
        onMouseMove={handleMapMouseMove}
      >
        <g transform={toSVG(transform)}>
          {gridEnabled && <MapGrid transform={transform} />}
          <MapObjects
            mapObjects={mapObjects}
            myself={myself}
            contrastColor={contrastColor}
            setHP={onSetHP}
            toolButtonState={toolButtonState}
            handleStartMoveMapObject={handleStartMoveMapObject}
            tokens={tokens}
            selectedObjectIds={selectedObjectIds}
            zoom={transform.a}
          />
          {withSelectionAreaDo(
            selectionArea,
            (x, y, w, h) => (
              <RoughRectangle
                x={x}
                y={y}
                w={w}
                h={h}
                fill={tinycolor(contrastColor).setAlpha(0.3).toRgbString()}
                fillStyle="solid"
              />
            ),
            null
          )}
          {entries(players).map((p) => {
            const player = playerData.get(p.id);
            if (!player || player.mapId !== mapId) {
              return null;
            }
            return p.tokenPath.length > 0 ? (
              <MapMeasurePath
                key={"path" + p.id}
                zoom={transform.a}
                color={player.color}
                mapBackgroundColor={backgroundColor}
                path={p.tokenPath}
              />
            ) : null;
          })}
          {entries(players).map((p) => {
            if (p.mapMouse === null || p.id === myself.id) {
              return null;
            }

            const player = playerData.get(p.id);
            if (!player || player.mapId !== mapId) {
              return null;
            }

            return (
              <MouseCursor
                key={p.id}
                zoom={transform.a}
                playerId={p.id}
                contrastColor={contrastColor}
                playerColor={player.color}
                playerName={player.name}
                position={p.mapMouse.position}
                positionHistory={p.mapMouse.positionHistory}
              />
            );
          })}
        </g>
      </svg>
    </RoughContextProvider>
  );
};
