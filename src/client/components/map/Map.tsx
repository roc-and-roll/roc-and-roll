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
  RRColor,
  RRMapID,
  RRMapObject,
  RRMapObjectID,
  RRPlayer,
  RRPlayerID,
  RRPoint,
  RRTokenID,
} from "../../../shared/state";
import { canControlMapObject } from "../../permissions";
import {
  ephermalPlayerIdsAtom,
  mapObjectIdsAtom,
  mapObjectsFamily,
  selectedMapObjectIdsAtom,
  selectedMapObjectsFamily,
  ToolButtonState,
} from "./MapContainer";
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
import { MapMouseHandler } from "./useMapToolHandler";
import { MapGrid } from "./MapGrid";
import { MapObjects } from "./MapObjects";
import { atom, atomFamily, useRecoilCallback, useRecoilValue } from "recoil";
import { useStateWithExistingRef, useStateWithRef } from "../../useRefState";
import { Debouncer, useDebounce } from "../../debounce";

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

export const hoveredMapObjectsFamily = atomFamily<boolean, RRMapObjectID>({
  key: "HoveredMapObject",
  default: false,
});

export const hoveredMapObjectIdsAtom = atom<RRMapObjectID[]>({
  key: "HoveredMapObjectIds",
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

export const RRMapView = React.memo<{
  myself: RRPlayer;
  mapId: RRMapID;
  gridEnabled: boolean;
  backgroundColor: RRColor;
  transformRef: React.MutableRefObject<Matrix>;
  onMoveMapObjects: (d: RRPoint) => void;
  onSetHP: (tokenId: RRTokenID, hp: number) => void;
  handleKeyDown: (event: KeyboardEvent) => void;
  players: EntityCollection<RRPlayer>;
  tokenPathDebounce: Debouncer;
  onUpdateTokenPath: (path: RRPoint[]) => void;
  onMousePositionChanged: (position: RRPoint) => void;
  toolHandler: MapMouseHandler;
  toolButtonState: ToolButtonState;
}>(function RRMapView({
  myself,
  mapId,
  gridEnabled,
  backgroundColor,
  onSetHP,
  handleKeyDown,
  onMoveMapObjects,
  transformRef,
  players,
  tokenPathDebounce,
  onUpdateTokenPath,
  onMousePositionChanged,
  toolButtonState,
  toolHandler,
}) {
  const [transform, setTransform] = useStateWithExistingRef<Matrix>(
    transformRef
  );

  const contrastColor = useMemo(
    () =>
      tinycolor.mostReadable(backgroundColor, ["#fff", "#000"]).toHexString(),
    [backgroundColor]
  );

  // TODO can't handle overlapping clicks
  const mouseActionRef = useRef<MouseAction>(MouseAction.NONE);

  const dragStartIdRef = useRef<RRMapObjectID | null>(null);
  const dragLastMouseRef = useRef<RRPoint>({
    x: 0,
    y: 0,
  });

  const [selectionArea, setSelectionArea] = useState<Rectangle | null>(null);

  const [tokenPath, tokenPathRef, setTokenPath] = useStateWithRef<RRPoint[]>(
    []
  );

  const syncTokenPath = useDebounce(onUpdateTokenPath, tokenPathDebounce);

  useEffect(() => {
    syncTokenPath(tokenPath);
  }, [tokenPath, syncTokenPath]);

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

      if (mouseActionRef.current !== MouseAction.NONE) return;

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
    [setTransform]
  );

  const addPointToPath = useCallback(
    (p: RRPoint) => {
      const path = tokenPathRef.current;
      const gridPosition = pointScale(snapPointToGrid(p), 1 / GRID_SIZE);
      if (path.length < 1) return setTokenPath([gridPosition]);

      // to make moving along a diagonal easier, we only count hits that are not on the corners
      const radius = (GRID_SIZE * 0.8) / 2;
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
          setTokenPath(path.slice(0, path.length - 1));
        } else {
          setTokenPath([
            ...path,
            ...pointsToReach(path[path.length - 1]!, gridPosition),
          ]);
        }
      }
    },
    [setTokenPath, tokenPathRef]
  );

  const handleMouseMove = useRecoilCallback(
    ({ snapshot }) => (e: MouseEvent) => {
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

      switch (mouseActionRef.current) {
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
            snapshot
              .getLoadable(mapObjectsFamily(dragStartIdRef.current!))
              .getValue()!.position,
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

      if (mouseActionRef.current !== MouseAction.NONE) {
        dragLastMouseRef.current = { x, y };
      }
    },
    [
      setTransform,
      transform,
      setSelectionArea,
      addPointToPath,
      onMoveMapObjects,
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

    mouseActionRef.current = newMouseAction;

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

  const updateHoveredMapObjects = useRecoilCallback(
    ({ snapshot, set, reset }) => (selectionArea: Rectangle | null) => {
      const lastHoveredObjectIds = snapshot
        .getLoadable(hoveredMapObjectIdsAtom)
        .getValue();

      withSelectionAreaDo<void>(
        selectionArea,
        (x, y, w, h) => {
          lastHoveredObjectIds.forEach((hoveredObjectId) =>
            reset(hoveredMapObjectsFamily(hoveredObjectId))
          );
          const hoveredMapObjectIds = snapshot
            .getLoadable(mapObjectIdsAtom)
            .getValue()
            .filter((mapObjectId) => {
              const mapObject = snapshot
                .getLoadable(mapObjectsFamily(mapObjectId))
                .getValue();
              return (
                mapObject &&
                canControlMapObject(mapObject, myself) &&
                mapObjectIntersectsWithRectangle(mapObject, { x, y, w, h })
              );
            });

          hoveredMapObjectIds.forEach((mapObjectId) => {
            set(hoveredMapObjectsFamily(mapObjectId), true);
          });
          set(
            hoveredMapObjectIdsAtom,
            hoveredMapObjectIds.map((each) => each)
          );
        },
        () => {
          lastHoveredObjectIds.forEach((mapObjectId) =>
            reset(hoveredMapObjectsFamily(mapObjectId))
          );
          set(hoveredMapObjectIdsAtom, []);
        }
      );
    },
    [myself]
  );

  useEffect(() => {
    updateHoveredMapObjects(selectionArea);
  }, [updateHoveredMapObjects, selectionArea]);

  const setSelectedMapObjectIds = useRecoilCallback(
    ({ snapshot, set, reset }) => (ids: RRMapObjectID[]) => {
      const lastSelectedObjectIds = snapshot
        .getLoadable(selectedMapObjectIdsAtom)
        .getValue();
      lastSelectedObjectIds.forEach((id) =>
        reset(selectedMapObjectsFamily(id))
      );

      set(selectedMapObjectIdsAtom, ids);
      ids.map((id) => set(selectedMapObjectsFamily(id), true));
    },
    []
  );

  const handleMouseUp = useRecoilCallback(
    ({ snapshot }) => (e: MouseEvent) => {
      if (mouseActionRef.current === MouseAction.MOVE_MAP_OBJECT) {
        setTokenPath([]);
        dragStartIdRef.current = null;
      }
      if (mouseActionRef.current === MouseAction.SELECTION_AREA) {
        const lastHoveredObjectIds = snapshot
          .getLoadable(hoveredMapObjectIdsAtom)
          .getValue()
          .filter(Boolean);
        setSelectedMapObjectIds(lastHoveredObjectIds);
        setSelectionArea(null);
      }
      if (mouseActionRef.current === MouseAction.USE_TOOL) {
        toolHandler.onMouseUp(globalToLocal(transform, localCoords(e)));
      }
      mouseActionRef.current = MouseAction.NONE;
    },
    [setTokenPath, setSelectedMapObjectIds, toolHandler, transform]
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

  const handleStartMoveMapObject = useRecoilCallback(
    ({ snapshot }) => (object: RRMapObject, event: React.MouseEvent) => {
      if (toolButtonState === "select" && canControlMapObject(object, myself)) {
        const local = localCoords(event);

        (document.activeElement as HTMLElement)?.blur();
        event.preventDefault();
        event.stopPropagation();
        dragStartIdRef.current = object.id;
        dragLastMouseRef.current = local;
        if (
          !snapshot
            .getLoadable(selectedMapObjectIdsAtom)
            .getValue()
            .includes(object.id)
        ) {
          setSelectedMapObjectIds([object.id]);
        }
        mouseActionRef.current = MouseAction.MOVE_MAP_OBJECT;
      }
    },
    [myself, setSelectedMapObjectIds, toolButtonState]
  );

  /* FIXME: doesn't actually feel that good. might have to do it only after we really
            drag and not just select.
  // we snap tokens to the cursor to make it easier for the user to aim diagonals
  useEffect(() => {
    if (dragStartId.current != null) {
      const object = mapObjects.find((o) => o.id === dragStartId.current)!;
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
            contrastColor={contrastColor}
            setHP={onSetHP}
            toolButtonState={toolButtonState}
            handleStartMoveMapObject={handleStartMoveMapObject}
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
          <MeasurePaths
            myId={myself.id}
            myTokenPath={tokenPath}
            mapId={mapId}
            zoom={transform.a}
            backgroundColor={backgroundColor}
            players={players}
          />
          <MouseCursors
            myId={myself.id}
            mapId={mapId}
            zoom={transform.a}
            contrastColor={contrastColor}
            players={players}
          />
        </g>
      </svg>
    </RoughContextProvider>
  );
});

function MeasurePaths({
  myId,
  myTokenPath,
  mapId,
  zoom,
  backgroundColor,
  players,
}: {
  myId: RRPlayerID;
  myTokenPath: RRPoint[];
  mapId: RRMapID;
  zoom: number;
  backgroundColor: string;
  players: EntityCollection<RRPlayer>;
}) {
  const ephermalPlayerIds = useRecoilValue(ephermalPlayerIdsAtom);
  return (
    <>
      {ephermalPlayerIds.map((ephermalPlayerId) => {
        const player = byId(players.entities, ephermalPlayerId);
        if (!player || player.currentMap !== mapId) {
          return null;
        }
        return (
          <MapMeasurePath
            key={ephermalPlayerId}
            ephermalPlayerId={ephermalPlayerId}
            zoom={zoom}
            color={player.color}
            mapBackgroundColor={backgroundColor}
            overwritePath={ephermalPlayerId === myId ? myTokenPath : undefined}
          />
        );
      })}
    </>
  );
}

function MouseCursors({
  myId,
  mapId,
  zoom,
  contrastColor,
  players,
}: {
  myId: RRPlayerID;
  mapId: RRMapID;
  zoom: number;
  contrastColor: string;
  players: EntityCollection<RRPlayer>;
}) {
  const ephermalPlayerIds = useRecoilValue(ephermalPlayerIdsAtom);
  return (
    <>
      {ephermalPlayerIds.map((ephermalPlayerId) => {
        if (ephermalPlayerId === myId) {
          return null;
        }

        const player = byId(players.entities, ephermalPlayerId);
        if (!player || player.currentMap !== mapId) {
          return null;
        }

        return (
          <MouseCursor
            key={ephermalPlayerId}
            playerId={player.id}
            playerColor={player.color}
            playerName={player.name}
            zoom={zoom}
            contrastColor={contrastColor}
          />
        );
      })}
    </>
  );
}
