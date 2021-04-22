import React, { useCallback, useEffect, useRef, useState } from "react";
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
  RRPlayer,
  RRToken,
  RRTokenOnMap,
  RRTokenOnMapID,
  TokensSyncedState,
} from "../../shared/state";
import { tokenImageUrl } from "../files";
import { canControlToken, canViewTokenOnMap } from "../permissions";

type Rectangle = [number, number, number, number];

const PANNING_BUTTON = 2;
const SELECTION_BUTTON = 0;

const ZOOM_SCALE_FACTOR = 0.2;

export type Point = { x: number; y: number };

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
}

export const globalToLocal = (transform: Matrix, p: Point) => {
  const [x, y] = applyToPoint(inverse(transform), [p.x, p.y]);
  return { x, y };
};

export const Map: React.FC<{
  myself: RRPlayer;
  tokensOnMap: RRTokenOnMap[];
  gridEnabled: boolean;
  backgroundColor: RRColor;
  tokens: TokensSyncedState;
  selectedTokens: RRTokenOnMapID[];
  transform: Matrix;
  setTransform: React.Dispatch<React.SetStateAction<Matrix>>;
  onMoveTokens: (dx: number, dy: number) => void;
  onSelectTokens: (ids: RRTokenOnMapID[]) => void;
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
  setTransform,
  transform,
}) => {
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
          onMoveTokens(frameDelta.x / transform.a, frameDelta.y / transform.a);
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
      onMoveTokens,
    ]
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
    });

    if (e.button === SELECTION_BUTTON) {
      const innerLocal = globalToLocal(transform, local);
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

  const hoveredTokens = withSelectionAreaDo<RRTokenOnMapID[]>(
    (x, y, w, h) =>
      tokensOnMap
        .filter((t) => {
          const token = byId(tokens.entities, t.tokenId);
          token &&
            canControlToken(token, myself) &&
            t.position.x + GRID_SIZE >= x &&
            x + w >= t.position.x &&
            t.position.y + GRID_SIZE >= y &&
            y + h >= t.position.y;
        })
        .map((t) => t.id),
    []
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      setMouseAction(MouseAction.NONE);

      if (mouseAction === MouseAction.SELECTION_AREA) {
        onSelectTokens(hoveredTokens);
        setSelectionArea(null);
      }
    },
    [mouseAction, onSelectTokens, hoveredTokens]
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
      onSelectTokens([t.id]);
    }
    setMouseAction(MouseAction.MOVE_TOKEN);
  };

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
        {tokensOnMap.map((t) => {
          const token = byId(tokens.entities, t.tokenId);
          if (!token || !canViewTokenOnMap(token, myself)) {
            return null;
          }

          return (
            <MapToken
              key={t.id}
              onStartMove={(e) => handleDragStart(e, t)}
              x={t.position.x}
              y={t.position.y}
              zoom={transform.a}
              token={token}
              selected={
                hoveredTokens.includes(t.id) || selectedTokens.includes(t.id)
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
    e.preventDefault();
    e.stopPropagation();
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
