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
import { GRID_SIZE } from "../../shared/constants";
import {
  byId,
  RRColor,
  RRMapObject,
  RRMapObjectID,
  RRPlayer,
  RRPlayerID,
  RRPoint,
  RRToken,
  TokensSyncedState,
} from "../../shared/state";
import { tokenImageUrl } from "../files";
import { canControlMapObject, canViewTokenOnMap } from "../permissions";
import { MapMouseHandler, ToolButtonState } from "./MapContainer";
import {
  RoughCircle,
  RoughContextProvider,
  RoughEllipse,
  RoughLine,
  RoughPath,
  RoughRectangle,
  RoughText,
} from "./rough";
import invert from "invert-color";
import useRafLoop from "../useRafLoop";
import { useLatest } from "../state";

type Rectangle = [number, number, number, number];

const PANNING_BUTTON = 2;
const TOOL_BUTTON = 0;

const ZOOM_SCALE_FACTOR = 0.2;

export type Point = { x: number; y: number };

// sync the cursor position to the server in this interval
export const CURSOR_POSITION_SYNC_DEBOUNCE = 300;

// record the cursor position this many times between each sync to the server
export const CURSOR_POSITION_SYNC_HISTORY_STEPS = 10;

const snapToGrid = (num: number) => Math.floor(num / GRID_SIZE) * GRID_SIZE;
export const snapPointToGrid = (p: Point) => ({
  x: snapToGrid(p.x),
  y: snapToGrid(p.y),
});

enum MouseAction {
  NONE,
  PAN,
  SELECTION_AREA,
  MOVE_TOKEN,
  USE_TOOL,
}

export const globalToLocal = (transform: Matrix, p: Point) => {
  const [x, y] = applyToPoint(inverse(transform), [p.x, p.y]);
  return { x, y };
};

export const Map: React.FC<{
  myself: RRPlayer;
  mapObjects: RRMapObject[];
  gridEnabled: boolean;
  backgroundColor: RRColor;
  tokens: TokensSyncedState;
  selectedObjects: RRMapObjectID[];
  transform: Matrix;
  setTransform: React.Dispatch<React.SetStateAction<Matrix>>;
  onMoveMapObjects: (dx: number, dy: number) => void;
  onSelectObjects: (ids: RRMapObjectID[]) => void;
  handleKeyDown: (event: KeyboardEvent) => void;
  mousePositions: Array<{
    playerId: RRPlayerID;
    playerName: string;
    playerColor: RRColor;
    position: RRPoint;
    positionHistory: RRPoint[];
  }>;
  onMousePositionChanged: (position: RRPoint) => void;
  toolHandler: MapMouseHandler;
  toolButtonState: ToolButtonState;
}> = ({
  myself,
  mapObjects,
  gridEnabled,
  backgroundColor,
  selectedObjects,
  onSelectObjects,
  handleKeyDown,
  onMoveMapObjects,
  tokens,
  setTransform,
  transform,
  mousePositions,
  onMousePositionChanged,
  toolButtonState,
  toolHandler,
}) => {
  const contrastColor = useMemo(() => invert(backgroundColor, true), [
    backgroundColor,
  ]);

  // TODO can't handle overlapping clicks
  const [mouseAction, setMouseAction] = useState<MouseAction>(MouseAction.NONE);
  const [dragState, setDragState] = useState({
    start: { x: 0, y: 0 },
    lastMouse: { x: 0, y: 0 },
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

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const { x, y } = localCoords(e);
      const frameDelta = {
        x: x - dragState.lastMouse.x,
        y: y - dragState.lastMouse.y,
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
          onMoveMapObjects(
            frameDelta.x / transform.a,
            frameDelta.y / transform.a
          );
          break;
        }
        case MouseAction.USE_TOOL: {
          toolHandler.onMouseMove(globalToLocal(transform, { x, y }));
          break;
        }
      }

      if (mouseAction !== MouseAction.NONE) {
        setDragState((p) => {
          return {
            ...p,
            lastMouse: { x, y },
          };
        });
      }
    },
    [
      dragState.lastMouse.x,
      dragState.lastMouse.y,
      mouseAction,
      setTransform,
      transform,
      onMoveMapObjects,
      toolHandler,
    ]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
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
    setDragState({
      start: local,
      lastMouse: local,
    });

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

  const handleDragStart = (e: React.MouseEvent, mapObject: RRMapObject) => {
    const local = localCoords(e);
    setDragState({
      start: local,
      lastMouse: local,
    });
    handleStartMoveMapObject(mapObject);
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
        .filter((o) => {
          return (
            canControlMapObject(o, myself) &&
            o.position.x + GRID_SIZE >= x &&
            x + w >= o.position.x &&
            o.position.y + GRID_SIZE >= y &&
            y + h >= o.position.y
          );
        })
        .map((t) => t.id),
    []
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      setMouseAction(MouseAction.NONE);

      if (mouseAction === MouseAction.SELECTION_AREA) {
        onSelectObjects(hoveredObjects);
        setSelectionArea(null);
      }
      if (mouseAction === MouseAction.USE_TOOL) {
        toolHandler.onMouseUp(globalToLocal(transform, localCoords(e)));
      }
    },
    [mouseAction, onSelectObjects, hoveredObjects, toolHandler, transform]
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
      event.preventDefault();
      event.stopPropagation();
      handleDragStart(event, object);
    }
  };

  return (
    <RoughContextProvider
      className="map-svg"
      ref={svgRef}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={handleMouseDown}
      style={{ backgroundColor }}
      onMouseMove={handleMapMouseMove}
    >
      <g transform={toSVG(transform)}>
        {grid}
        {withSelectionAreaDo(
          (x, y, w, h) => (
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill="rgba(255, 255, 255, 0.3)"
            />
          ),
          <></>
        )}
        {mapObjects.map((object) =>
          object.type === "rectangle" ? (
            <MapObjectThatIsNotAToken
              key={object.id}
              onStartMove={createHandleStartMoveGameObject(object)}
              object={object}
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
                onStartMove={createHandleStartMoveGameObject(t)}
                x={t.position.x}
                y={t.position.y}
                zoom={transform.a}
                token={token}
                selected={
                  hoveredObjects.includes(t.id) ||
                  selectedObjects.includes(t.id)
                }
              />
            );
          })}
        {mouseAction === MouseAction.MOVE_TOKEN && (
          <MapMeasureBar
            from={globalToLocal(transform, dragState.start)}
            to={globalToLocal(transform, dragState.lastMouse)}
            zoom={transform.a}
          />
        )}
        {mousePositions.map((each) => (
          <MouseCursor
            key={each.playerId}
            zoom={transform.a}
            contrastColor={contrastColor}
            {...each}
          />
        ))}
      </g>
    </RoughContextProvider>
  );
};

function MapObjectThatIsNotAToken({
  object,
  onStartMove,
}: {
  object: RRMapObject;
  onStartMove: (event: React.MouseEvent) => void;
}) {
  const ref = useLatest(onStartMove);

  const handleMouseDown = useCallback(
    (e) => {
      ref.current(e);
    },
    [ref]
  );

  if (object.type === "rectangle") {
    return (
      <RoughRectangle
        x={object.position.x}
        y={object.position.y}
        w={object.size.x}
        h={object.size.y}
        onMouseDown={handleMouseDown}
        fill="rgba(243, 186, 0, 0.5)"
        stroke="rgb(243, 186, 0)"
      />
    );
  } else {
    return null;
  }
}

const MouseCursor = React.memo(function MouseCursor(props: {
  zoom: number;
  contrastColor: RRColor;
  playerId: RRPlayerID;
  playerName: string;
  playerColor: RRColor;
  position: RRPoint;
  positionHistory: RRPoint[];
}) {
  const [rafStart, rafStop] = useRafLoop();

  const prevPosition = useRef<RRPoint | null>(null);
  const [position, setPosition] = useState(props.position);

  // Animate position changes
  useEffect(() => {
    const end = props.position;
    if (prevPosition.current) {
      const start = prevPosition.current;
      const points = [start, ...props.positionHistory, end];

      rafStart((linear) => {
        // we cannot use non-linear lerping, because that looks weird for continuous mouse movements
        const t = linear; // linear === 1 ? 1 : Math.sin((linear * Math.PI) / 2);

        // part of [0..1] that corresponds to the lerping between two
        // waypoints.
        const tPerPoint = 1 / (points.length - 1);

        const pointIdx =
          t === 1 ? points.length - 2 : Math.floor(t / tPerPoint);

        // percentage of the lerping of the current point.
        const pointT = (t - pointIdx * tPerPoint) / tPerPoint;

        const s = points[pointIdx]!;
        const e = points[pointIdx + 1]!;

        setPosition({
          x: s.x + (e.x - s.x) * pointT,
          y: s.y + (e.y - s.y) * pointT,
        });
      }, CURSOR_POSITION_SYNC_DEBOUNCE);
    }
    prevPosition.current = end;

    return () => {
      rafStop();
    };
  }, [prevPosition, props.position, props.positionHistory, rafStart, rafStop]);

  return (
    <g
      transform={`translate(${position.x},${position.y}) scale(${
        0.5 / props.zoom
      })`}
    >
      <RoughPath
        // https://mavo.io/demos/svgpath/
        x={0}
        y={0}
        path={`m 0 0 v ${GRID_SIZE} h ${(GRID_SIZE * 5) / 7} l ${
          (-GRID_SIZE * 5) / 7
        } ${-GRID_SIZE}`}
        fillStyle="solid"
        fill={props.playerColor}
        stroke={props.contrastColor}
      />
      <RoughText
        x={0}
        y={GRID_SIZE * 1.1 + 2 * 16}
        fontSize="32px"
        fill={props.contrastColor}
      >
        {props.playerName}
      </RoughText>
    </g>
  );
});

function MapMeasureBar({
  from,
  to,
  zoom,
}: {
  from: Point;
  to: Point;
  zoom: number;
}) {
  const distance =
    (Math.sqrt(Math.pow(from.x - to.x, 2) + Math.pow(from.y - to.y, 2)) /
      GRID_SIZE) *
    5;
  return (
    <>
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        style={{ strokeDasharray: "10", strokeWidth: 5 }}
        stroke="rgba(255, 255, 255, 0.3)"
      />
      <text x={to.x + GRID_SIZE} y={to.y} fill="#fff" fontSize={14 / zoom}>
        {distance.toFixed(1) + "ft"}
      </text>
    </>
  );
}

function MapToken({
  token,
  x,
  y,
  selected,
  onStartMove,
  zoom,
}: {
  token: RRToken;
  x: number;
  y: number;
  zoom: number;
  selected: boolean;
  onStartMove: (e: React.MouseEvent) => void;
}) {
  const handleMouseDown = (e: React.MouseEvent) => {
    onStartMove(e);
  };

  const tokenSize = GRID_SIZE * token.scale;
  return (
    <>
      {token.image ? (
        <image
          onMouseDown={handleMouseDown}
          x={x}
          y={y}
          width={tokenSize}
          height={tokenSize}
          href={tokenImageUrl(token.image, tokenSize, Math.ceil(zoom))}
        />
      ) : (
        <circle
          onMouseDown={handleMouseDown}
          cx={x + tokenSize / 2}
          cy={y + tokenSize / 2}
          r={tokenSize / 2}
          fill="red"
        />
      )}
      {selected && (
        <circle
          onMouseDown={handleMouseDown}
          cx={x + tokenSize / 2}
          cy={y + tokenSize / 2}
          r={tokenSize / 2 - 2}
          fill="transparent"
          className="selection-area-highlight"
        />
      )}
    </>
  );
}
