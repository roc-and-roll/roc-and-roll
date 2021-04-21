import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  scale,
  translate,
  compose,
  applyToPoint,
  Matrix,
  identity,
  toSVG,
  inverse,
} from "transformation-matrix";
import {
  RRColor,
  RRPlayer,
  RRToken,
  RRTokenOnMap,
  RRTokenOnMapID,
  TokensSyncedState,
} from "../../shared/state";
import { fileUrl } from "../files";
import { byId } from "../state";

type Rectangle = [number, number, number, number];

const GRID_SIZE = 70;

const PANNING_BUTTON = 2;
const SELECTION_BUTTON = 0;

const ZOOM_SCALE_FACTOR = 0.2;

type Point = { x: number; y: number };

enum MouseAction {
  NONE,
  PAN,
  SELECTION_AREA,
  MOVE_TOKEN,
}

export const Map: React.FC<{
  myself: RRPlayer;
  tokensOnMap: RRTokenOnMap[];
  gridEnabled: boolean;
  backgroundColor: RRColor;
  tokens: TokensSyncedState;
  selectedTokens: RRTokenOnMapID[];
  onMoveTokens: (dx: number, dy: number) => void;
  onSelectTokens: (tokens: RRTokenOnMap[]) => void;
  handleKeyDown: (event: KeyboardEvent) => void;
}> = ({
  myself,
  tokensOnMap,
  gridEnabled,
  backgroundColor,
  selectedTokens,
  onSelectTokens,
  handleKeyDown,
  onMoveTokens,
  tokens,
}) => {
  const [transform, setTransform] = useState<Matrix>(identity());
  // TODO can't handle overlapping clicks
  const [mouseAction, setMouseAction] = useState<MouseAction>(MouseAction.NONE);
  const [dragState, setDragState] = useState({
    start: { x: 0, y: 0 },
    lastMouse: { x: 0, y: 0 },
    delta: { x: 0, y: 0 },
  });

  const [selectionArea, setSelectionArea] = useState<Rectangle | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  const localCoords = (e: MouseEvent | React.MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const globalToLocal = useCallback(
    (p: Point) => {
      const [x, y] = applyToPoint(inverse(transform), [p.x, p.y]);
      return { x, y };
    },
    [transform]
  );

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
    [mouseAction]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const { x, y } = localCoords(e);

      switch (mouseAction) {
        case MouseAction.PAN: {
          setTransform((t) =>
            compose(
              translate(x - dragState.lastMouse.x, y - dragState.lastMouse.y),
              t
            )
          );
          break;
        }
        case MouseAction.SELECTION_AREA: {
          const innerLocal = globalToLocal({ x, y });
          setSelectionArea(
            (a) => a && [a[0], a[1], innerLocal.x, innerLocal.y]
          );
          break;
        }
        case MouseAction.MOVE_TOKEN: {
          // const [localX, localY] = localCoords(e);
          // onMoveTokens(localX - lastMousePos[0], localY - lastMousePos[1]);
          break;
        }
      }

      if (mouseAction !== MouseAction.NONE) {
        setDragState((p) => {
          return {
            ...p,
            lastMouse: { x, y },
            delta: { x: x - p.start.x, y: y - p.start.y },
          };
        });
      }
    },
    [dragState.lastMouse.x, dragState.lastMouse.y, globalToLocal, mouseAction]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMouseAction(
      e.button === PANNING_BUTTON
        ? MouseAction.PAN
        : e.button === SELECTION_BUTTON
        ? MouseAction.SELECTION_AREA
        : MouseAction.NONE
    );

    const local = localCoords(e);
    setDragState({
      start: local,
      lastMouse: local,
      delta: { x: 0, y: 0 },
    });

    if (e.button === SELECTION_BUTTON) {
      const innerLocal = globalToLocal(local);
      setSelectionArea([
        innerLocal.x,
        innerLocal.y,
        innerLocal.x,
        innerLocal.y,
      ]);
    }
  };

  const handleDragStart = (e: React.MouseEvent, token: RRTokenOnMap) => {
    const local = localCoords(e);
    setDragState({
      start: local,
      lastMouse: local,
      delta: { x: 0, y: 0 },
    });
    handleStartMoveToken(token);
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

  const canControlTokenOnMap = (t: RRTokenOnMap) => {
    const token = byId(tokens.entities, t.tokenId);
    return (
      token &&
      (token.visibility === "everyone" ||
        myself.isGM ||
        myself.tokenIds.includes(token.id))
    );
  };

  const hoveredTokens = withSelectionAreaDo<RRTokenOnMap[]>(
    (x, y, w, h) =>
      tokensOnMap.filter(
        (t) =>
          canControlTokenOnMap(t) &&
          t.position.x + GRID_SIZE >= x &&
          x + w >= t.position.x &&
          t.position.y + GRID_SIZE >= y &&
          y + h >= t.position.y
      ),
    []
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (mouseAction === MouseAction.MOVE_TOKEN) {
        // commit change to server
        onMoveTokens(
          dragState.delta.x / transform.a,
          dragState.delta.y / transform.a
        );
      }

      setMouseAction(MouseAction.NONE);

      if (mouseAction === MouseAction.SELECTION_AREA) {
        onSelectTokens(hoveredTokens);
        setSelectionArea(null);
      }
    },
    [
      mouseAction,
      onMoveTokens,
      dragState.delta.x,
      dragState.delta.y,
      transform.a,
      onSelectTokens,
      hoveredTokens,
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

  const handleStartMoveToken = (t: RRTokenOnMap) => {
    if (!selectedTokens.includes(t.id)) {
      onSelectTokens([t]);
    }
    setMouseAction(MouseAction.MOVE_TOKEN);
  };

  const tokenPosition = (t: RRTokenOnMap) =>
    mouseAction === MouseAction.MOVE_TOKEN && selectedTokens.includes(t.id)
      ? {
          x: t.position.x + dragState.delta.x / transform.a,
          y: t.position.y + dragState.delta.y / transform.a,
        }
      : t.position;

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

  return (
    <svg
      className="map-svg"
      ref={svgRef}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={handleMouseDown}
      style={{ backgroundColor }}
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
        {tokensOnMap.flatMap((t) => {
          const token = byId(tokens.entities, t.tokenId);
          if (!token || !canControlTokenOnMap(t)) {
            return [];
          }

          const position = tokenPosition(t);
          return (
            <MapToken
              key={t.id}
              onStartMove={(e) => handleDragStart(e, t)}
              x={position.x}
              y={position.y}
              token={token}
              selected={
                hoveredTokens.includes(t) || selectedTokens.includes(t.id)
              }
            />
          );
        })}
        {mouseAction === MouseAction.MOVE_TOKEN && (
          <MapMeasureBar
            from={globalToLocal(dragState.start)}
            to={globalToLocal(dragState.lastMouse)}
            zoom={transform.a}
          />
        )}
      </g>
    </svg>
  );
};

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
}: {
  token: RRToken;
  x: number;
  y: number;
  selected: boolean;
  onStartMove: (e: React.MouseEvent) => void;
}) {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onStartMove(e);
  };

  return (
    <>
      {token.image ? (
        <image
          onMouseDown={handleMouseDown}
          x={x}
          y={y}
          width={GRID_SIZE * token.size}
          height={GRID_SIZE * token.size}
          href={fileUrl(token.image)}
        />
      ) : (
        <circle
          onMouseDown={handleMouseDown}
          cx={x + (GRID_SIZE * token.size) / 2}
          cy={y + (GRID_SIZE * token.size) / 2}
          r="35"
          fill="red"
        />
      )}
      {selected && (
        <circle
          onMouseDown={handleMouseDown}
          cx={x + (GRID_SIZE * token.size) / 2}
          cy={y + (GRID_SIZE * token.size) / 2}
          r={(GRID_SIZE * token.size) / 2 - 2}
          fill="transparent"
          className="selection-area-highlight"
        />
      )}
    </>
  );
}
