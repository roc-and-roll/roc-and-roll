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
import { canControlMapObject, canViewTokenOnMap } from "../../permissions";
import { ToolButtonState } from "./MapContainer";
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
} from "../../point";
import { MapToken } from "./MapToken";
import { MouseCursor } from "./MouseCursor";
import { MapMeasurePath } from "./MapMeasurePath";
import { MapObjectThatIsNotAToken } from "./MapObjectThatIsNotAToken";
import { MapMouseHandler } from "./CreateMapMouseHandler";

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
  MOVE_TOKEN,
  USE_TOOL,
}

export const globalToLocal = (transform: Matrix, p: RRPoint) => {
  const [x, y] = applyToPoint(inverse(transform), [p.x, p.y]);
  return { x, y };
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
  selectedObjects,
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
        case MouseAction.MOVE_TOKEN: {
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
      dragLastMouseRef,
      mouseAction,
      setTransform,
      transform,
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

  const withSelectionAreaDo = <T extends any>(
    cb: (x: number, y: number, w: number, h: number) => T,
    otherwise: T
  ): T => {
    if (!selectionArea) return otherwise;

    const left = Math.min(selectionArea[0], selectionArea[2]);
    const right = Math.max(selectionArea[0], selectionArea[2]);
    const top = Math.min(selectionArea[1], selectionArea[3]);
    const bottom = Math.max(selectionArea[1], selectionArea[3]);
    return cb(left, top, right - left, bottom - top);
  };

  const hoveredObjects = withSelectionAreaDo<RRMapObjectID[]>(
    (x, y, w, h) =>
      mapObjects
        .filter(
          (o) =>
            canControlMapObject(o, myself) &&
            mapObjectIntersectsWithRectangle(o, { x, y, w, h })
        )
        .map((t) => t.id),
    []
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      setMouseAction(MouseAction.NONE);

      if (mouseAction === MouseAction.MOVE_TOKEN) {
        onUpdateTokenPath([]);
        setDragStartID(null);
      }
      if (mouseAction === MouseAction.SELECTION_AREA) {
        onSelectObjects(hoveredObjects);
        setSelectionArea(null);
      }
      if (mouseAction === MouseAction.USE_TOOL) {
        toolHandler.onMouseUp(globalToLocal(transform, localCoords(e)));
      }
    },
    [
      mouseAction,
      onUpdateTokenPath,
      onSelectObjects,
      hoveredObjects,
      toolHandler,
      transform,
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

  const handleStartMoveMapObject = (t: RRMapObject) => {
    if (!selectedObjects.includes(t.id)) {
      onSelectObjects([t.id]);
    }
    setMouseAction(MouseAction.MOVE_TOKEN);
  };

  const handleMapMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      onMousePositionChanged(globalToLocal(transform, localCoords(e)));
    },
    [onMousePositionChanged, transform]
  );

  const grid = gridEnabled ? (
    <>
      <defs>
        <pattern
          id="grid"
          width={GRID_SIZE}
          height={GRID_SIZE}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
            fill="none"
            stroke="gray"
            strokeWidth="1"
          />
        </pattern>
      </defs>

      <rect
        x={-transform.e / transform.a}
        y={-transform.f / transform.a}
        width={`${100 / transform.a}%`}
        height={`${100 / transform.a}%`}
        fill="url(#grid)"
      />
    </>
  ) : null;

  const createHandleStartMoveGameObject = (object: RRMapObject) => (
    event: React.MouseEvent
  ) => {
    if (toolButtonState === "select" && canControlMapObject(object, myself)) {
      const local = localCoords(event);

      (document.activeElement as HTMLElement)?.blur();
      event.preventDefault();
      event.stopPropagation();
      setDragStartID(object.id);
      dragLastMouseRef.current = local;
      handleStartMoveMapObject(object);
    }
  };

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

  const [auraArea, setAuraArea] = useState<SVGGElement | null>(null);
  const [healthbarArea, setHealthbarArea] = useState<SVGGElement | null>(null);

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
          {grid}
          <g ref={setAuraArea} />
          {mapObjects
            // render images first, so that they always are in the background
            .sort((a, b) => +(b.type === "image") - +(a.type === "image"))
            .map((object) =>
              object.type !== "token" ? (
                <MapObjectThatIsNotAToken
                  key={object.id}
                  onStartMove={createHandleStartMoveGameObject(object)}
                  object={object}
                  canStartMoving={toolButtonState === "select"}
                  selected={
                    hoveredObjects.includes(object.id) ||
                    selectedObjects.includes(object.id)
                  }
                />
              ) : null
            )}
          {mapObjects
            .flatMap((o) => (o.type === "token" ? o : []))
            .map((t) => {
              const token = byId(tokens.entities, t.tokenId);
              if (!token || !canViewTokenOnMap(token, myself)) {
                return null;
              }

              return (
                <MapToken
                  key={t.id}
                  auraArea={auraArea}
                  healthbarArea={healthbarArea}
                  onStartMove={createHandleStartMoveGameObject(t)}
                  canStartMoving={toolButtonState === "select"}
                  x={t.position.x}
                  y={t.position.y}
                  zoom={transform.a}
                  token={token}
                  selected={
                    hoveredObjects.includes(t.id) ||
                    selectedObjects.includes(t.id)
                  }
                  setHP={(hp) => onSetHP(token.id, hp)}
                  contrastColor={contrastColor}
                />
              );
            })}
          <g ref={setHealthbarArea} />
          {withSelectionAreaDo(
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
