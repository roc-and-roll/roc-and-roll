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

type Rectangle = [number, number, number, number];

const PANNING_BUTTON = 2;
const SELECTION_BUTTON = 0;

interface TokenOnMap {
  id: string;
  x: number;
  y: number;
  color: string;
}

const ZOOM_SCALE_FACTOR = 0.2;

export const Map: React.FC<{ tokens: TokenOnMap[]; className: string }> = ({
  tokens,
  className,
}) => {
  const [transform, setTransform] = useState<Matrix>(identity());
  // TODO can't handle overlapping clicks
  const [mouseDown, setMouseDown] = useState<number | undefined>(undefined);
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
      if (mouseDown === PANNING_BUTTON) {
        setTransform((t) =>
          compose(
            translate(localX - lastMousePos[0], localY - lastMousePos[1]),
            t
          )
        );
      }
      if (mouseDown === SELECTION_BUTTON) {
        const innerLocal = applyToPoint(inverse(transform), [localX, localY]);
        setSelectionArea((a) => a && [a[0], a[1], ...innerLocal]);
      }
      setLastMousePos([localX, localY]);
    },
    [lastMousePos, mouseDown, transform]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMouseDown(e.button);

    const local = localCoords(e);
    setLastMousePos(local);

    if (e.button === SELECTION_BUTTON) {
      const innerLocal = applyToPoint(inverse(transform), local);
      setSelectionArea([...innerLocal, ...innerLocal]);
    }
  };

  const handleMouseUp = useCallback((e: MouseEvent) => {
    setMouseDown(undefined);
    setSelectionArea(null);
  }, []);

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);
    const svg = svgRef.current;
    svg?.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
      svg?.removeEventListener("wheel", handleWheel);
    };
  }, [handleMouseMove, handleWheel, handleMouseUp]);

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

  const selectedTokens = withSelectionAreaDo<TokenOnMap[]>(
    (x, y, w, h) =>
      tokens.filter(
        (t) => t.x >= x && t.y >= y && t.x <= x + w && t.y <= y + h
      ),
    []
  );

  return (
    <svg
      ref={svgRef}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={handleMouseDown}
      className={className}
    >
      <g transform={toSVG(transform)}>
        {withSelectionAreaDo(
          (x, y, w, h) => (
            <rect x={x} y={y} width={w} height={h} />
          ),
          <></>
        )}
        {tokens.map((t) => (
          <MapToken
            key={t.id}
            x={t.x}
            y={t.y}
            color={t.color}
            selected={selectedTokens.includes(t)}
          />
        ))}
      </g>
    </svg>
  );
};

export const MapToken: React.FC<{
  x: number;
  y: number;
  color: string;
  selected: boolean;
}> = ({ x, y, color, selected }) => {
  return (
    <circle
      cx={x}
      cy={y}
      r="20"
      fill={color}
      className={selected ? "selection-area-highlight" : ""}
    />
  );
};
