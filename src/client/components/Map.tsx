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
  const [lastMousePos, setLastMousePos] = useState<[number, number]>([0, 0]);

  const [selectionArea, setSelectionArea] = useState<Rectangle | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  const localCoords = (e: MouseEvent | React.MouseEvent): [number, number] => {
    if (!svgRef.current) return [0, 0];
    const rect = svgRef.current.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  };

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const [localX, localY] = localCoords(e);
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
        translate(localX, localY),
        scale(Math.pow(1.05, -delta)),
        translate(-localX, -localY),
        t
      );
    });
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const [localX, localY] = localCoords(e);
      switch (mouseAction) {
        case MouseAction.PAN: {
          setTransform((t) =>
            compose(
              translate(localX - lastMousePos[0], localY - lastMousePos[1]),
              t
            )
          );
          break;
        }
        case MouseAction.SELECTION_AREA: {
          const innerLocal = applyToPoint(inverse(transform), [localX, localY]);
          setSelectionArea((a) => a && [a[0], a[1], ...innerLocal]);
          break;
        }
        case MouseAction.MOVE_TOKEN: {
          const [localX, localY] = localCoords(e);
          onMoveTokens(localX - lastMousePos[0], localY - lastMousePos[1]);
          break;
        }
      }

      if (mouseAction !== MouseAction.NONE) setLastMousePos([localX, localY]);
    },
    [lastMousePos, mouseAction, transform, onMoveTokens]
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
    setLastMousePos(local);

    if (e.button === SELECTION_BUTTON) {
      const innerLocal = applyToPoint(inverse(transform), local);
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
      setMouseAction(MouseAction.NONE);
      if (e.button === SELECTION_BUTTON) {
        onSelectTokens(hoveredTokens);
        setSelectionArea(null);
      }
    },
    [hoveredTokens, onSelectTokens]
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
        {tokensOnMap.map((t) => (
          <MapToken
            key={t.tokenId}
            onStartMove={() => handleStartMoveToken(t)}
            x={t.position.x}
            y={t.position.y}
            token={tokens.entities[t.tokenId]!}
            selected={
              hoveredTokens.includes(t) || selectedTokens.includes(t.tokenId)
            }
          />
        ))}
      </g>
    </svg>
  );
};

export const MapToken: React.FC<{
  token: RRToken;
  x: number;
  y: number;
  selected: boolean;
  onStartMove: () => void;
}> = ({ token, x, y, selected, onStartMove }) => {
  /*const [moving, setMoving] = useState(false);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {}, []);

  useEffect(() => {
    if (moving) {
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("mousemove", handleMouseMove);
    }
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [handleMouseMove, handleMouseUp, moving]);*/

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStartMove();
  };

  return (
    <>
      {token.image && (
        <defs>
          <pattern id={`image-${token.id}`} height="40" width="40">
            <image
              x="0"
              y="0"
              height="40"
              width="40"
              xlinkHref={fileUrl(token.image)}
            ></image>
          </pattern>
        </defs>
      )}
      <circle
        onMouseDown={handleMouseDown}
        cx={x}
        cy={y}
        r="20"
        fill={token.image ? `url(#image-${token.id})` : "red"}
        className={selected ? "selection-area-highlight" : ""}
      />
    </>
  );
};
