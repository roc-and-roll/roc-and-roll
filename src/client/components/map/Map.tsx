import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
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
  identity,
  rotateDEG,
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
  RRCharacterID,
  RRCapPoint,
} from "../../../shared/state";
import { canControlMapObject } from "../../permissions";
import {
  ephemeralPlayerIdsAtom,
  mapObjectIdsAtom,
  mapObjectsFamily,
  selectedMapObjectIdsAtom,
  selectedMapObjectsFamily,
  ToolButtonState,
} from "./MapContainer";
import { RoughContextProvider } from "../rough";
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
} from "../../../shared/point";
import { MouseCursor } from "./MouseCursor";
import { MapMeasurePath } from "./MapMeasurePath";
import { MapMouseHandler } from "./useMapToolHandler";
import { MapGrid } from "./MapGrid";
import { MapObjects } from "./MapObjects";
import { atom, atomFamily, useRecoilCallback, useRecoilValue } from "recoil";
import { useStateWithRef } from "../../useRefState";
import { Debouncer, useDebounce } from "../../debounce";
import { useRRSettings } from "../../settings";
import { assertNever } from "../../../shared/util";
import { FogOfWar } from "./FogOfWar";
import { MapReactions } from "./MapReactions";
import useLocalState from "../../useLocalState";
import { useContrastColor } from "../../util";

type Rectangle = [number, number, number, number];

export type MapAreas = {
  imageArea: SVGGElement;
  auraArea: SVGGElement;
  defaultArea: SVGGElement;
  tokenArea: SVGGElement;
  healthbarArea: SVGGElement;
};

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
  MEASURE,
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

const isometricMatrix = compose(scale(1, 0.5), rotateDEG(-45));

function matrixRotationDEG(matrix: Matrix): number {
  return (Math.atan2(-matrix.b, matrix.a) * 180) / Math.PI;
}

export const RRMapView = React.memo<{
  myself: RRPlayer;
  mapId: RRMapID;
  gridEnabled: boolean;
  gridColor: RRColor;
  backgroundColor: RRColor;
  transformRef: React.MutableRefObject<Matrix>;
  onMoveMapObjects: (d: RRPoint) => void;
  onStopMoveMapObjects: () => void;
  onSmartSetTotalHP: (tokenId: RRCharacterID, hp: number) => void;
  handleKeyDown: (event: KeyboardEvent) => void;
  players: EntityCollection<RRPlayer>;
  measurePathDebounce: Debouncer;
  onUpdateMeasurePath: (path: RRPoint[]) => void;
  onMousePositionChanged: (position: RRPoint) => void;
  toolHandler: MapMouseHandler;
  toolButtonState: ToolButtonState;
  revealedAreas: RRCapPoint[][] | null;
  toolOverlay: JSX.Element | null;
}>(function RRMapView({
  myself,
  mapId,
  gridEnabled,
  gridColor,
  backgroundColor,
  onSmartSetTotalHP,
  handleKeyDown,
  onMoveMapObjects,
  onStopMoveMapObjects,
  transformRef,
  players,
  measurePathDebounce,
  onUpdateMeasurePath,
  onMousePositionChanged,
  toolButtonState,
  toolHandler,
  revealedAreas,
  toolOverlay,
}) {
  const [settings] = useRRSettings();
  const [roughEnabled, setRoughEnabled] = useState(
    settings.renderMode !== "fast"
  );
  // We deliberately do not use useStateWithRef/useStateWithExistingRef here,
  // because we want transformRef to reflect the currently rendered transform,
  // instead of the committed (using setTransform), but potentially not yet
  // rendered transform.
  const [transform, setTransform] = useLocalState<Matrix>(
    `map/${mapId}/transform`,
    identity(),
    sessionStorage
  );
  transformRef.current = transform;

  useLayoutEffect(() => {
    if (settings.enableExperimental25D) {
      setTransform((old) => {
        if (matrixRotationDEG(old) === matrixRotationDEG(isometricMatrix)) {
          return old;
        }
        return compose(old, isometricMatrix);
      });
    } else {
      setTransform((old) => {
        if (matrixRotationDEG(old) === 0) {
          return old;
        }
        return compose(old, inverse(isometricMatrix));
      });
    }
  }, [settings.enableExperimental25D, setTransform]);

  const contrastColor = useContrastColor(backgroundColor);

  // TODO can't handle overlapping clicks
  const mouseActionRef = useRef<MouseAction>(MouseAction.NONE);

  const dragStartIdRef = useRef<RRMapObjectID | null>(null);
  const dragLastMouseRef = useRef<RRPoint>({
    x: 0,
    y: 0,
  });

  const [selectionArea, setSelectionArea] = useState<Rectangle | null>(null);

  const [measurePath, measurePathRef, setMeasurePath] = useStateWithRef<
    RRPoint[]
  >([]);

  const [syncMeasurePath] = useDebounce(
    onUpdateMeasurePath,
    measurePathDebounce
  );

  useEffect(() => {
    syncMeasurePath(measurePath);
  }, [measurePath, syncMeasurePath]);

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

      // https://developer.mozilla.org/en-US/docs/Web/API/WheelEvent/deltaMode
      const delta =
        e.deltaMode === 0x00 // pixel mode
          ? (e.deltaY / 100) * 16 * ZOOM_SCALE_FACTOR
          : e.deltaMode === 0x01 // line mode
          ? e.deltaY
          : // weird page mode
            3;

      toolHandler.onMouseWheel(delta);

      if (mouseActionRef.current !== MouseAction.NONE) return;

      const { x, y } = localCoords(e);
      setTransform((t) =>
        compose(
          translate(x, y),
          scale(Math.pow(1.05, -delta)),
          translate(-x, -y),
          t
        )
      );
    },
    [setTransform, toolHandler]
  );

  const addPointToPath = useCallback(
    (p: RRPoint) => {
      const path = measurePathRef.current;
      const gridPosition = pointScale(snapPointToGrid(p), 1 / GRID_SIZE);
      if (path.length < 1) return setMeasurePath([gridPosition]);

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
          path.slice(1).some((p) => pointEquals(p, gridPosition))
        ) {
          setMeasurePath(
            path.slice(0, path.findIndex((p) => pointEquals(p, gridPosition))!)
          );
        } else {
          setMeasurePath([
            ...path,
            ...pointsToReach(path[path.length - 1]!, gridPosition),
          ]);
        }
      }
    },
    [setMeasurePath, measurePathRef]
  );

  const handleMouseMove = useRecoilCallback(
    ({ snapshot }) =>
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

        switch (mouseActionRef.current) {
          case MouseAction.PAN: {
            setTransform((t) =>
              compose(translate(frameDelta.x, frameDelta.y), t)
            );
            break;
          }
          case MouseAction.SELECTION_AREA: {
            const innerLocal = globalToLocal(transformRef.current, {
              x,
              y,
            });
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
            onMoveMapObjects(
              pointScale(frameDelta, 1 / transformRef.current.a)
            );
            break;
          }
          case MouseAction.MEASURE: {
            const innerLocal = globalToLocal(transformRef.current, {
              x,
              y,
            });
            const pointsInPath = (from: RRPoint, to: RRPoint) => {
              const points: RRPoint[] = [from];
              while (!pointEquals(from, to)) {
                const step = pointSign(pointSubtract(to, from));
                from = pointAdd(from, step);
                points.push(from);
              }
              return points;
            };
            setMeasurePath((measurePath) => {
              if (measurePath.length === 0) return measurePath;
              return pointsInPath(
                measurePath[0]!,
                pointScale(snapPointToGrid(innerLocal), 1 / GRID_SIZE)
              );
            });
            break;
          }
          case MouseAction.USE_TOOL: {
            toolHandler.onMouseMove(
              globalToLocal(transformRef.current, { x, y })
            );
            break;
          }
          case MouseAction.NONE:
            break;
          default:
            assertNever(mouseActionRef.current);
        }

        if (mouseActionRef.current !== MouseAction.NONE) {
          dragLastMouseRef.current = { x, y };
        }
      },
    [
      setTransform,
      transformRef,
      addPointToPath,
      onMoveMapObjects,
      setMeasurePath,
      toolHandler,
    ]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (mouseActionRef.current !== MouseAction.NONE) {
        // Ignore additional mouse downs while we are currently handling another
        // mouse down action (e.g., ignore right clicks while drawing a
        // rectangle)
        return;
      }

      (document.activeElement as HTMLElement | null)?.blur();
      e.preventDefault();
      e.stopPropagation();
      const newMouseAction =
        e.button === PANNING_BUTTON
          ? MouseAction.PAN
          : e.button === TOOL_BUTTON
          ? toolButtonState === "select"
            ? MouseAction.SELECTION_AREA
            : toolButtonState === "measure"
            ? MouseAction.MEASURE
            : MouseAction.USE_TOOL
          : MouseAction.NONE;

      mouseActionRef.current = newMouseAction;

      if (
        newMouseAction === MouseAction.PAN &&
        settings.renderMode === "mostly-fancy"
      ) {
        setRoughEnabled(false);
      }

      const local = localCoords(e);
      dragLastMouseRef.current = local;

      const innerLocal = globalToLocal(transformRef.current, local);
      if (newMouseAction === MouseAction.SELECTION_AREA) {
        setSelectionArea([
          innerLocal.x,
          innerLocal.y,
          innerLocal.x,
          innerLocal.y,
        ]);
      } else if (newMouseAction === MouseAction.USE_TOOL) {
        toolHandler.onMouseDown(innerLocal);
      } else if (newMouseAction === MouseAction.MEASURE) {
        setMeasurePath([
          pointScale(snapPointToGrid(innerLocal), 1 / GRID_SIZE),
        ]);
      }
    },
    [
      setMeasurePath,
      settings.renderMode,
      toolButtonState,
      toolHandler,
      transformRef,
    ]
  );

  const updateHoveredMapObjects = useRecoilCallback(
    ({ snapshot, set, reset }) =>
      (selectionArea: Rectangle | null) => {
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
    ({ snapshot, set, reset }) =>
      (ids: RRMapObjectID[]) => {
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
    ({ snapshot }) =>
      (e: MouseEvent) => {
        switch (mouseActionRef.current) {
          case MouseAction.MOVE_MAP_OBJECT:
            onStopMoveMapObjects();
            setMeasurePath([]);
            dragStartIdRef.current = null;
            break;
          case MouseAction.SELECTION_AREA: {
            const lastHoveredObjectIds = snapshot
              .getLoadable(hoveredMapObjectIdsAtom)
              .getValue()
              .filter(Boolean);
            setSelectedMapObjectIds(lastHoveredObjectIds);
            setSelectionArea(null);
            break;
          }
          case MouseAction.USE_TOOL:
            toolHandler.onMouseUp(
              globalToLocal(transformRef.current, localCoords(e))
            );
            break;
          case MouseAction.MEASURE:
            setMeasurePath([]);
            break;
          case MouseAction.PAN:
            if (settings.renderMode === "mostly-fancy") {
              setRoughEnabled(true);
            }
            break;
          case MouseAction.NONE:
            break;
          default:
            assertNever(mouseActionRef.current);
        }

        mouseActionRef.current = MouseAction.NONE;
      },
    [
      settings.renderMode,
      setMeasurePath,
      setSelectedMapObjectIds,
      toolHandler,
      transformRef,
      onStopMoveMapObjects,
    ]
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
      onMousePositionChanged(
        globalToLocal(transformRef.current, localCoords(e))
      );
    },
    [onMousePositionChanged, transformRef]
  );

  const handleStartMoveMapObject = useRecoilCallback(
    ({ snapshot }) =>
      (object: RRMapObject, event: React.MouseEvent) => {
        if (
          event.button === TOOL_BUTTON &&
          toolButtonState === "select" &&
          canControlMapObject(object, myself)
        ) {
          const local = localCoords(event);

          (document.activeElement as HTMLElement | null)?.blur();
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

  useEffect(() => {
    switch (settings.renderMode) {
      case "fancy":
        setRoughEnabled(true);
        break;
      case "fast":
        setRoughEnabled(false);
        break;
      case "mostly-fancy":
        setRoughEnabled(mouseActionRef.current !== MouseAction.PAN);
        break;
      default:
        assertNever(settings.renderMode);
    }
  }, [settings.renderMode]);

  const [imageArea, setImageArea] = useState<SVGGElement | null>(null);
  const [auraArea, setAuraArea] = useState<SVGGElement | null>(null);
  const [defaultArea, setDefaultArea] = useState<SVGGElement | null>(null);
  const [tokenArea, setTokenArea] = useState<SVGGElement | null>(null);
  const [healthbarArea, setHealthbarArea] = useState<SVGGElement | null>(null);

  const areas = useMemo(
    () =>
      imageArea && auraArea && defaultArea && tokenArea && healthbarArea
        ? {
            imageArea: imageArea,
            auraArea: auraArea,
            defaultArea: defaultArea,
            tokenArea: tokenArea,
            healthbarArea: healthbarArea,
          }
        : null,
    [imageArea, auraArea, defaultArea, tokenArea, healthbarArea]
  );

  const [viewPortSize, setViewPortSize] = useState(() => makePoint(0));

  useEffect(() => {
    if (!svgRef.current) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        throw new Error("This should never happen");
      }

      setViewPortSize({
        x: (Array.isArray(entry.borderBoxSize)
          ? entry.borderBoxSize[0]!
          : entry.borderBoxSize
        ).inlineSize,
        y: (Array.isArray(entry.borderBoxSize)
          ? entry.borderBoxSize[0]!
          : entry.borderBoxSize
        ).blockSize,
      });
    });

    // For some reason, we MUST NOT use svgRef.current here.
    // This causes the ResizeObserver to constantly fire events (at least in
    // Chrome).
    resizeObserver.observe(svgRef.current.parentElement!);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <RoughContextProvider enabled={roughEnabled}>
      <svg
        ref={svgRef}
        className="map-svg"
        onContextMenu={(e) => e.preventDefault()}
        onMouseDown={handleMouseDown}
        style={mapStyle}
        onMouseMove={handleMapMouseMove}
      >
        <g transform={toSVG(transform)}>
          <g ref={setImageArea} />
          <g ref={setAuraArea} />
          <g ref={setDefaultArea} />
          {gridEnabled && (
            <MapGrid
              transform={transform}
              viewPortSize={viewPortSize}
              color={gridColor}
            />
          )}
          <g ref={setTokenArea} />
          <g ref={setHealthbarArea} />

          {areas && (
            <MapObjects
              mapId={mapId}
              areas={areas}
              contrastColor={contrastColor}
              smartSetTotalHP={onSmartSetTotalHP}
              toolButtonState={toolButtonState}
              handleStartMoveMapObject={handleStartMoveMapObject}
              zoom={transform.a}
            />
          )}

          <FogOfWar
            transform={transform}
            viewportSize={viewPortSize}
            revealedAreas={revealedAreas}
          />

          {withSelectionAreaDo(
            selectionArea,
            (x, y, w, h) => (
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill={tinycolor(contrastColor).setAlpha(0.3).toRgbString()}
              />
            ),
            null
          )}
          <MeasurePaths
            myId={myself.id}
            myMeasurePath={measurePath}
            mapId={mapId}
            zoom={transform.a}
            backgroundColor={backgroundColor}
            players={players}
          />
          <MapReactions mapId={mapId} />
          <MouseCursors
            myId={myself.id}
            mapId={mapId}
            transform={transform}
            viewPortSize={viewPortSize}
            contrastColor={contrastColor}
            players={players}
          />
          {toolOverlay}
        </g>
      </svg>
    </RoughContextProvider>
  );
});

function MeasurePaths({
  myId,
  myMeasurePath,
  mapId,
  zoom,
  backgroundColor,
  players,
}: {
  myId: RRPlayerID;
  myMeasurePath: RRPoint[];
  mapId: RRMapID;
  zoom: number;
  backgroundColor: string;
  players: EntityCollection<RRPlayer>;
}) {
  const ephemeralPlayerIds = useRecoilValue(ephemeralPlayerIdsAtom);
  return (
    <>
      {ephemeralPlayerIds.map((ephemeralPlayerId) => {
        const player = byId(players.entities, ephemeralPlayerId);
        if (!player || player.currentMap !== mapId) {
          return null;
        }
        return (
          <MapMeasurePath
            key={ephemeralPlayerId}
            ephemeralPlayerId={ephemeralPlayerId}
            zoom={zoom}
            color={player.color}
            mapBackgroundColor={backgroundColor}
            overwritePath={
              ephemeralPlayerId === myId ? myMeasurePath : undefined
            }
          />
        );
      })}
    </>
  );
}

function MouseCursors({
  myId,
  mapId,
  transform,
  viewPortSize,
  contrastColor,
  players,
}: {
  myId: RRPlayerID;
  mapId: RRMapID;
  transform: Matrix;
  viewPortSize: RRPoint;
  contrastColor: string;
  players: EntityCollection<RRPlayer>;
}) {
  const ephemeralPlayerIds = useRecoilValue(ephemeralPlayerIdsAtom);
  return (
    <>
      {ephemeralPlayerIds.map((ephemeralPlayerId) => {
        if (ephemeralPlayerId === myId) {
          return null;
        }

        const player = byId(players.entities, ephemeralPlayerId);
        if (!player || player.currentMap !== mapId) {
          return null;
        }

        return (
          <MouseCursor
            key={ephemeralPlayerId}
            playerId={player.id}
            playerColor={player.color}
            playerName={player.name}
            transform={transform}
            viewPortSize={viewPortSize}
            contrastColor={contrastColor}
          />
        );
      })}
    </>
  );
}
