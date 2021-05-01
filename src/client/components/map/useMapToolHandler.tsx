import { useRef } from "react";
import {
  mapObjectAdd,
  mapObjectRemove,
  mapObjectUpdate,
} from "../../../shared/actions";
import {
  RRMap,
  RRMapDrawingBase,
  RRMapObject,
  RRMapObjectID,
  RRPlayer,
  RRPoint,
} from "../../../shared/state";
import { useServerDispatch } from "../../state";
import { GRID_SIZE } from "../../../shared/constants";
import { assertNever, rrid } from "../../../shared/util";
import { askAndUploadFiles } from "../../files";
import { pointEquals, pointSubtract } from "../../point";
import { MapEditState } from "./MapContainer";
import { Matrix } from "transformation-matrix";

export interface MapMouseHandler {
  onMouseDown: (p: RRPoint) => void;
  onMouseMove: (p: RRPoint) => void;
  onMouseUp: (p: RRPoint) => void;
}

// Thin points using the idea described here
// https://jackschaedler.github.io/handwriting-recognition/
export function thin(points: ReadonlyArray<RRPoint>, squareSize: number) {
  const result: RRPoint[] = [];

  for (let i = 0; i < points.length; i++) {
    const current = points[i]!;
    result.push(current);

    let next: RRPoint | undefined;
    do {
      next = points[++i];
    } while (
      next &&
      Math.abs(current.x - next.x) < squareSize &&
      Math.abs(current.y - next.y) < squareSize
    );
    i--;
  }

  return result;
}

// note: this is not actually a component but we're just tricking the linter >:)
export function useMapToolHandler(
  myself: RRPlayer,
  map: RRMap,
  editState: MapEditState,
  transform: React.MutableRefObject<Matrix>
): MapMouseHandler {
  const dispatch = useServerDispatch();

  const currentId = useRef<RRMapObjectID | null>(null);

  const startMousePositionRef = useRef<RRPoint>({
    x: 0,
    y: 0,
  });
  const pointsRef = useRef<RRPoint[]>([]);

  const toolHandlerRef = useRef<MapMouseHandler>();

  if (editState.tool === "draw") {
    const create = (p: RRPoint): RRMapDrawingBase => ({
      id: rrid<RRMapObject>(),
      playerId: myself.id,
      color: editState.color,
      position: p,
      locked: false,
    });

    switch (editState.type) {
      case "rectangle":
        toolHandlerRef.current = {
          onMouseDown: (p: RRPoint) => {
            startMousePositionRef.current = p;
            currentId.current = dispatch(
              mapObjectAdd(map.id, {
                type: "rectangle",
                size: { x: 0, y: 0 },
                ...create(p),
              })
            ).payload.mapObject.id;
          },
          onMouseMove: (p: RRPoint) => {
            if (currentId.current) {
              dispatch(
                mapObjectUpdate(map.id, {
                  id: currentId.current,
                  changes: {
                    size: pointSubtract(p, startMousePositionRef.current),
                  },
                })
              );
            }
          },
          onMouseUp: (p: RRPoint) => {
            if (
              currentId.current &&
              pointEquals(startMousePositionRef.current, p)
            ) {
              dispatch(
                mapObjectRemove({
                  mapId: map.id,
                  mapObjectId: currentId.current,
                })
              );
            }
            currentId.current = null;
          },
        };
        break;
      case "ellipse":
        toolHandlerRef.current = {
          onMouseDown: (p: RRPoint) => {
            startMousePositionRef.current = p;
            currentId.current = dispatch(
              mapObjectAdd(map.id, {
                type: "ellipse",
                size: { x: 0, y: 0 },
                ...create(p),
              })
            ).payload.mapObject.id;
          },
          onMouseMove: (p: RRPoint) => {
            if (currentId.current) {
              dispatch(
                mapObjectUpdate(map.id, {
                  id: currentId.current,
                  changes: {
                    size: pointSubtract(p, startMousePositionRef.current),
                  },
                })
              );
            }
          },
          onMouseUp: (p: RRPoint) => {
            if (
              currentId.current &&
              pointEquals(startMousePositionRef.current, p)
            ) {
              dispatch(
                mapObjectRemove({
                  mapId: map.id,
                  mapObjectId: currentId.current,
                })
              );
            }
            currentId.current = null;
          },
        };
        break;
      case "line":
        toolHandlerRef.current = {
          onMouseDown: (p: RRPoint) => {
            startMousePositionRef.current = p;
            currentId.current = dispatch(
              mapObjectAdd(map.id, {
                type: "freehand",
                points: [{ x: 0, y: 0 }],
                ...create(p),
              })
            ).payload.mapObject.id;
          },
          onMouseMove: (p: RRPoint) => {
            if (currentId.current) {
              dispatch(
                mapObjectUpdate(map.id, {
                  id: currentId.current,
                  changes: {
                    points: [pointSubtract(p, startMousePositionRef.current)],
                  },
                })
              );
            }
          },
          onMouseUp: (p: RRPoint) => {
            if (
              currentId.current &&
              pointEquals(startMousePositionRef.current, p)
            ) {
              dispatch(
                mapObjectRemove({
                  mapId: map.id,
                  mapObjectId: currentId.current,
                })
              );
            }
            currentId.current = null;
          },
        };
        break;
      case "text":
        toolHandlerRef.current = {
          onMouseDown: (p: RRPoint) => {},
          onMouseMove: (p: RRPoint) => {},
          onMouseUp: (p: RRPoint) => {
            const text = prompt("enter text")?.trim();
            if (text === undefined || text.length === 0) {
              return;
            }
            currentId.current = dispatch(
              mapObjectAdd(map.id, {
                type: "text",
                text,
                ...create(p),
              })
            ).payload.mapObject.id;
          },
        };
        break;
      case "polygon":
      case "freehand":
        toolHandlerRef.current = {
          onMouseDown: (p: RRPoint) => {
            startMousePositionRef.current = p;
            pointsRef.current = [];
            currentId.current = dispatch(
              mapObjectAdd(map.id, {
                type: editState.type === "freehand" ? "freehand" : "polygon",
                points: [],
                ...create(p),
              })
            ).payload.mapObject.id;
          },
          onMouseMove: (p: RRPoint) => {
            if (currentId.current) {
              const oldNumPoints = pointsRef.current.length;
              pointsRef.current = thin(
                [
                  ...pointsRef.current,
                  pointSubtract(p, startMousePositionRef.current),
                ],
                GRID_SIZE / 4 / transform.current.a
              );

              if (oldNumPoints !== pointsRef.current.length) {
                dispatch(
                  mapObjectUpdate(map.id, {
                    id: currentId.current,
                    changes: {
                      points: [...pointsRef.current],
                    },
                  })
                );
              }
            }
          },
          onMouseUp: (p: RRPoint) => {
            if (currentId.current && pointsRef.current.length === 0) {
              dispatch(
                mapObjectRemove({
                  mapId: map.id,
                  mapObjectId: currentId.current,
                })
              );
            }
            currentId.current = null;
          },
        };
        break;
      case "image":
        toolHandlerRef.current = {
          onMouseDown: (p: RRPoint) => {},
          onMouseMove: (p: RRPoint) => {},
          onMouseUp: async (p: RRPoint) => {
            const files = await askAndUploadFiles();
            if (files === null) {
              return;
            }
            const image = files[0]!;

            const widthText = prompt(
              "enter the width of the image in #number of squares"
            );
            if (widthText === null) {
              return;
            }
            const width = parseInt(widthText);
            if (isNaN(width)) {
              return;
            }

            const heightText = prompt(
              "enter the height of the image in #number of squares"
            );
            if (heightText === null) {
              return;
            }
            const height = parseInt(heightText);
            if (isNaN(height)) {
              return;
            }

            dispatch(
              mapObjectAdd(map.id, {
                type: "image",
                size: { x: width * GRID_SIZE, y: height * GRID_SIZE },
                image,
                ...create(p),
              })
            );
          },
        };
        break;
      default:
        assertNever(editState);
    }
  } else {
    toolHandlerRef.current = {
      onMouseDown: (p: RRPoint) => {},
      onMouseMove: (p: RRPoint) => {},
      onMouseUp: (p: RRPoint) => {},
    };
  }

  return useRef({
    onMouseDown: (p: RRPoint) => toolHandlerRef.current!.onMouseDown(p),
    onMouseMove: (p: RRPoint) => toolHandlerRef.current!.onMouseMove(p),
    onMouseUp: (p: RRPoint) => toolHandlerRef.current!.onMouseUp(p),
  }).current;
}
