import React, { useEffect, useRef, useState, WheelEvent } from "react";
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

export const Map: React.FC<{ tokens: TokenOnMap[] }> = ({ tokens }) => {
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

  const handleWheel = (e: WheelEvent<SVGElement>) => {
    e.preventDefault();

    const [localX, localY] = localCoords(e);
    setTransform((t) =>
      compose(
        translate(localX, localY),
        scale(Math.pow(1.05, -(e.deltaY || 1))),
        translate(-localX, -localY),
        t
      )
    );
  };

  const handleMouseMove = (e: MouseEvent) => {
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
  };

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

  const handleMouseUp = (e: MouseEvent) => {
    setMouseDown(undefined);
    setSelectionArea(null);
  };

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  });

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
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={handleMouseDown}
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
