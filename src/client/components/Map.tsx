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
  RRID,
  RRToken,
  RRTokenOnMap,
  TokensSyncedState,
} from "../../shared/state";
import { fileUrl } from "../files";
import { byId } from "../state";

type Rectangle = [number, number, number, number];

const PANNING_BUTTON = 2;
const SELECTION_BUTTON = 0;

const ZOOM_SCALE_FACTOR = 0.2;

enum MouseAction {
  NONE,
  PAN,
  SELECTION_AREA,
  MOVE_TOKEN,
}

export const Map: React.FC<{
  tokensOnMap: RRTokenOnMap[];
  tokens: TokensSyncedState;
  selectedTokens: RRID[];
  onMoveTokens: (dx: number, dy: number) => void;
  onSelectTokens: (tokens: RRTokenOnMap[]) => void;
  handleKeyDown: (event: KeyboardEvent) => void;
}> = ({
  tokensOnMap,
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
          const innerLocal = applyToPoint(inverse(transform), [x, y]);
          setSelectionArea((a) => a && [a[0], a[1], ...innerLocal]);
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
    [dragState, mouseAction, transform]
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
      const innerLocal = applyToPoint(inverse(transform), [local.x, local.y]);
      setSelectionArea([...innerLocal, ...innerLocal]);
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

  const hoveredTokens = withSelectionAreaDo<RRTokenOnMap[]>(
    (x, y, w, h) =>
      tokensOnMap.filter(
        (t) =>
          t.position.x >= x &&
          t.position.y >= y &&
          t.position.x <= x + w &&
          t.position.y <= y + h
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
    if (!selectedTokens.includes(t.tokenId)) {
      onSelectTokens([t]);
    }
    setMouseAction(MouseAction.MOVE_TOKEN);
  };

  return (
    <svg
      className="map"
      ref={svgRef}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={handleMouseDown}
    >
      <g transform={toSVG(transform)}>
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
          const position =
            mouseAction === MouseAction.MOVE_TOKEN &&
            selectedTokens.includes(t.tokenId)
              ? {
                  x: t.position.x + dragState.delta.x / transform.a,
                  y: t.position.y + dragState.delta.y / transform.a,
                }
              : t.position;
          return (
            <MapToken
              key={t.tokenId}
              onStartMove={(e: React.MouseEvent) => {
                const local = localCoords(e);
                setDragState({
                  start: local,
                  lastMouse: local,
                  delta: { x: 0, y: 0 },
                });
                handleStartMoveToken(t);
              }}
              x={position.x}
              y={position.y}
              token={byId(tokens.entities, t.tokenId)!}
              selected={
                hoveredTokens.includes(t) || selectedTokens.includes(t.tokenId)
              }
            />
          );
        })}
      </g>
    </svg>
  );
};

export const MapToken: React.FC<{
  token: RRToken;
  x: number;
  y: number;
  selected: boolean;
  onStartMove: (e: React.MouseEvent) => void;
}> = ({ token, x, y, selected, onStartMove }) => {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStartMove(e);
  };

  const SIZE = 70;

  return (
    <>
      {token.image ? (
        <image
          onMouseDown={handleMouseDown}
          x={x}
          y={y}
          width={SIZE}
          height={SIZE}
          href={fileUrl(token.image)}
          className={selected ? "selection-area-highlight" : ""}
        />
      ) : (
        <circle
          onMouseDown={handleMouseDown}
          cx={x + SIZE / 2}
          cy={y + SIZE / 2}
          r="35"
          fill="red"
          className={selected ? "selection-area-highlight" : ""}
        />
      )}
      {selected && (
        <circle
          onMouseDown={handleMouseDown}
          cx={x + SIZE / 2}
          cy={y + SIZE / 2}
          r="35"
          fill="transparent"
          className="selection-area-highlight"
        />
      )}
    </>
  );
};
