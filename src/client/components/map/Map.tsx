import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
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
  EntityCollection,
  RRColor,
  RRMapID,
  RRMapObject,
  RRMapObjectID,
  RRPlayer,
  RRPoint,
  RRCharacterID,
  RRMapRevealedAreas,
} from "../../../shared/state";
import { canControlMapObject } from "../../permissions";
import { RRPlayerToolProps, ToolButtonState } from "./MapContainer";
import {
  mapObjectIdsAtom,
  mapObjectsFamily,
  selectedMapObjectIdsAtom,
  selectedMapObjectsFamily,
} from "./recoil";
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
import { MapMouseHandler } from "./useMapToolHandler";
import { MapGrid } from "./MapGrid";
import { MapObjects } from "./MapObjects";
import { atom, atomFamily, useRecoilCallback } from "recoil";
import { useRRSettings } from "../../settings";
import { assertNever } from "../../../shared/util";
import { FogOfWar } from "./FogOfWar";
import { MapReactions } from "./MapReactions";
import useLocalState from "../../useLocalState";
import { useContrastColor } from "../../util";
import { MeasurePaths } from "./MeasurePaths";
import { MouseCursors } from "./MouseCursors";
import { useLatest } from "../../useLatest";

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

const localCoords = (
  svg: SVGSVGElement | null,
  e: MouseEvent | React.MouseEvent
) => {
  if (!svg) return { x: 0, y: 0 };
  const rect = svg.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
};

export type RRMapViewRef = { transform: Matrix };

const RRMapViewWithRef = React.forwardRef<
  RRMapViewRef,
  {
    myself: RRPlayerToolProps;
    mapId: RRMapID;
    gridEnabled: boolean;
    gridColor: RRColor;
    backgroundColor: RRColor;
    revealedAreas: RRMapRevealedAreas;
    onMoveMapObjects: (d: RRPoint) => void;
    onStopMoveMapObjects: () => void;
    onSmartSetTotalHP: (characterId: RRCharacterID, hp: number) => void;
    handleKeyDown: (event: KeyboardEvent) => void;
    players: EntityCollection<RRPlayer>;
    onUpdateMeasurePath: React.Dispatch<React.SetStateAction<RRPoint[]>>;
    onMousePositionChanged: (position: RRPoint) => void;
    toolHandler: MapMouseHandler;
    toolButtonState: ToolButtonState;
    toolOverlay: JSX.Element | null;
  }
>(function RRMapViewWithRef(
  {
    myself,
    mapId,
    gridEnabled,
    gridColor,
    backgroundColor,
    revealedAreas,
    onSmartSetTotalHP,
    handleKeyDown,
    onMoveMapObjects,
    onStopMoveMapObjects,
    players,
    onUpdateMeasurePath,
    onMousePositionChanged,
    toolButtonState,
    toolHandler,
    toolOverlay,
  },
  ref
) {
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
    () => identity(),
    sessionStorage
  );
  const transformRef = useLatest(transform);

  useImperativeHandle(
    ref,
    () => ({
      transform,
    }),
    [transform]
  );

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

  const svgRef = useRef<SVGSVGElement>(null);

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

      const { x, y } = localCoords(svgRef.current, e);
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
      onUpdateMeasurePath((path) => {
        const gridPosition = pointScale(snapPointToGrid(p), 1 / GRID_SIZE);
        if (path.length < 1) return [gridPosition];

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
          (path.length < 1 ||
            !pointEquals(path[path.length - 1]!, gridPosition))
        ) {
          if (
            path.length > 1 &&
            path.slice(1).some((p) => pointEquals(p, gridPosition))
          ) {
            return path.slice(
              0,
              path.findIndex((p) => pointEquals(p, gridPosition))!
            );
          } else {
            return [
              ...path,
              ...pointsToReach(path[path.length - 1]!, gridPosition),
            ];
          }
        }
        return path;
      });
    },
    [onUpdateMeasurePath]
  );

  const handleMouseMove = useRecoilCallback(
    ({ snapshot }) =>
      (e: MouseEvent) => {
        const mouseAction = mouseActionRef.current;

        if (mouseAction === MouseAction.NONE) {
          return;
        }

        const { x, y } = localCoords(svgRef.current, e);
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
            onUpdateMeasurePath((measurePath) => {
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
          default:
            assertNever(mouseAction);
        }

        dragLastMouseRef.current = { x, y };
      },
    [
      setTransform,
      transformRef,
      addPointToPath,
      onMoveMapObjects,
      onUpdateMeasurePath,
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

      const local = localCoords(svgRef.current, e);
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
        onUpdateMeasurePath([
          pointScale(snapPointToGrid(innerLocal), 1 / GRID_SIZE),
        ]);
      }
    },
    [
      onUpdateMeasurePath,
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
            onUpdateMeasurePath([]);
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
              globalToLocal(
                transformRef.current,
                localCoords(svgRef.current, e)
              )
            );
            break;
          case MouseAction.MEASURE:
            onUpdateMeasurePath([]);
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
      onUpdateMeasurePath,
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
        globalToLocal(transformRef.current, localCoords(svgRef.current, e))
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
          const local = localCoords(svgRef.current, event);

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
            imageArea,
            auraArea,
            defaultArea,
            tokenArea,
            healthbarArea,
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
        style={{
          backgroundColor,
          cursor: toolButtonState === "tool" ? "crosshair" : "inherit",
        }}
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

export const RRMapView = React.memo(RRMapViewWithRef);
