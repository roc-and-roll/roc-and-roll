import React, { useMemo, useRef, useState } from "react";
import {
  assetImageAdd,
  mapObjectAdd,
  mapObjectRemove,
  mapObjectUpdate,
} from "../../../shared/actions";
import {
  RRCapPoint,
  RRMap,
  RRMapID,
  RRMapObject,
  RRMapObjectID,
  RRMapRevealedAreas,
  RRPoint,
} from "../../../shared/state";
import { useServerDispatch } from "../../state";
import {
  DEFAULT_BACKGROUND_IMAGE_HEIGHT,
  GRID_SIZE,
} from "../../../shared/constants";
import { assertNever, rrid } from "../../../shared/util";
import { askAndUploadImages } from "../../files";
import {
  pointAdd,
  pointEquals,
  pointSubtract,
  toCap,
} from "../../../shared/point";
import { MapEditState, RRPlayerToolProps } from "./MapContainer";
import Shape from "@doodle3d/clipper-js";
import tinycolor from "tinycolor2";
import { RRMessage, useServerMessages } from "../../serverMessages";
import { RRMapViewRef } from "./Map";
import { usePrompt } from "../../dialog-boxes";

const SERVER_SYNC_THROTTLE_TIME = 100;

export interface MapMouseHandler {
  onMouseDown: (p: RRPoint) => void;
  onMouseMove: (p: RRPoint) => void;
  onMouseUp: (p: RRPoint) => void;
  onMouseWheel: (delta: number) => void;
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
  myself: RRPlayerToolProps,
  {
    mapId,
    mapBackgroundColor,
  }: {
    mapId: RRMapID;
    mapBackgroundColor: RRMap["settings"]["backgroundColor"];
  },
  editState: MapEditState,
  mapViewRef: React.RefObject<RRMapViewRef>,
  {
    setRevealedAreas,
  }: {
    setRevealedAreas: React.Dispatch<React.SetStateAction<RRMapRevealedAreas>>;
  }
): [MapMouseHandler, JSX.Element | null] {
  const dispatch = useServerDispatch();

  const currentId = useRef<RRMapObjectID | null>(null);

  const startMousePositionRef = useRef<RRPoint>({
    x: 0,
    y: 0,
  });
  const pointsRef = useRef<RRPoint[]>([]);

  const toolHandlerRef = useRef<Partial<MapMouseHandler>>({});

  const [mouseDown, setMouseDown] = useState(false);
  const [mousePosition, setMousePosition] = useState<RRPoint>({ x: 0, y: 0 });
  const [revealToolSize, setRevealToolSize] = useState(140);

  const contrastColor = useMemo(
    () =>
      tinycolor
        .mostReadable(mapBackgroundColor, ["#fff", "#000"])
        .setAlpha(0.3)
        .toRgbString(),
    [mapBackgroundColor]
  );

  const { send } = useServerMessages();

  const prompt = usePrompt();

  if (editState.tool === "draw") {
    const create = (p: RRPoint) => ({
      id: rrid<RRMapObject>(),
      playerId: myself.id,
      color: editState.color,
      position: p,
      rotation: 0,
      locked: false,
      visibility: editState.visibility,
    });

    switch (editState.type) {
      case "rectangle":
        toolHandlerRef.current = {
          onMouseDown: (p: RRPoint) => {
            startMousePositionRef.current = p;
            const action = mapObjectAdd(mapId, {
              type: "rectangle",
              size: { x: 0, y: 0 },
              ...create(p),
            });
            currentId.current = action.payload.mapObject.id;
            dispatch({
              actions: [action],
              optimisticKey: `MapToolHandler/add/${currentId.current}`,
              syncToServerThrottle: SERVER_SYNC_THROTTLE_TIME,
            });
          },
          onMouseMove: (p: RRPoint) => {
            if (currentId.current) {
              dispatch({
                actions: [
                  mapObjectUpdate(mapId, {
                    id: currentId.current,
                    changes: {
                      size: pointSubtract(p, startMousePositionRef.current),
                    },
                  }),
                ],
                optimisticKey: `MapToolHandler/add/${currentId.current}/edit`,
                syncToServerThrottle: SERVER_SYNC_THROTTLE_TIME,
              });
            }
          },
          onMouseUp: (p: RRPoint) => {
            if (
              currentId.current &&
              pointEquals(startMousePositionRef.current, p)
            ) {
              dispatch({
                actions: [
                  mapObjectRemove({
                    mapId: mapId,
                    mapObjectId: currentId.current,
                  }),
                ],
                optimisticKey: `MapToolHandler/add/${currentId.current}/edit`,
                syncToServerThrottle: SERVER_SYNC_THROTTLE_TIME,
              });
            }
            currentId.current = null;
          },
        };
        break;
      case "ellipse":
        toolHandlerRef.current = {
          onMouseDown: (p: RRPoint) => {
            startMousePositionRef.current = p;
            const action = mapObjectAdd(mapId, {
              type: "ellipse",
              size: { x: 0, y: 0 },
              ...create(p),
            });
            currentId.current = action.payload.mapObject.id;
            dispatch({
              actions: [action],
              optimisticKey: `MapToolHandler/add/${currentId.current}`,
              syncToServerThrottle: SERVER_SYNC_THROTTLE_TIME,
            });
          },
          onMouseMove: (p: RRPoint) => {
            if (currentId.current) {
              dispatch({
                actions: [
                  mapObjectUpdate(mapId, {
                    id: currentId.current,
                    changes: {
                      size: pointSubtract(p, startMousePositionRef.current),
                    },
                  }),
                ],
                optimisticKey: `MapToolHandler/add/${currentId.current}/edit`,
                syncToServerThrottle: SERVER_SYNC_THROTTLE_TIME,
              });
            }
          },
          onMouseUp: (p: RRPoint) => {
            if (
              currentId.current &&
              pointEquals(startMousePositionRef.current, p)
            ) {
              dispatch({
                actions: [
                  mapObjectRemove({
                    mapId: mapId,
                    mapObjectId: currentId.current,
                  }),
                ],
                optimisticKey: `MapToolHandler/add/${currentId.current}/edit`,
                syncToServerThrottle: SERVER_SYNC_THROTTLE_TIME,
              });
            }
            currentId.current = null;
          },
        };
        break;
      case "line":
        toolHandlerRef.current = {
          onMouseDown: (p: RRPoint) => {
            startMousePositionRef.current = p;
            const action = mapObjectAdd(mapId, {
              type: "freehand",
              points: [{ x: 0, y: 0 }],
              ...create(p),
            });
            currentId.current = action.payload.mapObject.id;
            dispatch({
              actions: [action],
              optimisticKey: `MapToolHandler/add/${currentId.current}`,
              syncToServerThrottle: SERVER_SYNC_THROTTLE_TIME,
            });
          },
          onMouseMove: (p: RRPoint) => {
            if (currentId.current) {
              dispatch({
                actions: [
                  mapObjectUpdate(mapId, {
                    id: currentId.current,
                    changes: {
                      points: [pointSubtract(p, startMousePositionRef.current)],
                    },
                  }),
                ],
                optimisticKey: `MapToolHandler/add/${currentId.current}/edit`,
                syncToServerThrottle: SERVER_SYNC_THROTTLE_TIME,
              });
            }
          },
          onMouseUp: (p: RRPoint) => {
            if (
              currentId.current &&
              pointEquals(startMousePositionRef.current, p)
            ) {
              dispatch({
                actions: [
                  mapObjectRemove({
                    mapId: mapId,
                    mapObjectId: currentId.current,
                  }),
                ],
                optimisticKey: `MapToolHandler/add/${currentId.current}/edit`,
                syncToServerThrottle: SERVER_SYNC_THROTTLE_TIME,
              });
            }
            currentId.current = null;
          },
        };
        break;
      case "text":
        toolHandlerRef.current = {
          onMouseUp: async (p: RRPoint) => {
            const text = (await prompt("enter text"))?.trim();
            if (text === undefined || text.length === 0) {
              return;
            }
            const action = mapObjectAdd(mapId, {
              type: "text",
              text,
              ...create(p),
            });
            currentId.current = action.payload.mapObject.id;
            dispatch({
              actions: [action],
              optimisticKey: `MapToolHandler/add/${currentId.current}`,
              syncToServerThrottle: SERVER_SYNC_THROTTLE_TIME,
            });
          },
        };
        break;
      case "polygon":
      case "freehand":
        toolHandlerRef.current = {
          onMouseDown: (p: RRPoint) => {
            startMousePositionRef.current = p;
            pointsRef.current = [];
            const action = mapObjectAdd(mapId, {
              type: editState.type === "freehand" ? "freehand" : "polygon",
              points: [],
              ...create(p),
            });
            currentId.current = action.payload.mapObject.id;
            dispatch({
              actions: [action],
              optimisticKey: `MapToolHandler/add/${currentId.current}`,
              syncToServerThrottle: SERVER_SYNC_THROTTLE_TIME,
            });
          },
          onMouseMove: (p: RRPoint) => {
            if (currentId.current) {
              const oldNumPoints = pointsRef.current.length;
              pointsRef.current = thin(
                [
                  ...pointsRef.current,
                  pointSubtract(p, startMousePositionRef.current),
                ],
                GRID_SIZE / 4 / (mapViewRef.current?.transform.a ?? 1)
              );

              if (oldNumPoints !== pointsRef.current.length) {
                dispatch({
                  actions: [
                    mapObjectUpdate(mapId, {
                      id: currentId.current,
                      changes: {
                        points: [...pointsRef.current],
                      },
                    }),
                  ],
                  optimisticKey: `MapToolHandler/add/${currentId.current}/edit`,
                  syncToServerThrottle: SERVER_SYNC_THROTTLE_TIME,
                });
              }
            }
          },
          onMouseUp: (p: RRPoint) => {
            if (currentId.current && pointsRef.current.length === 0) {
              dispatch({
                actions: [
                  mapObjectRemove({
                    mapId: mapId,
                    mapObjectId: currentId.current,
                  }),
                ],
                optimisticKey: `MapToolHandler/add/${currentId.current}/edit`,
                syncToServerThrottle: SERVER_SYNC_THROTTLE_TIME,
              });
            }
            currentId.current = null;
          },
        };
        break;
      case "image":
        toolHandlerRef.current = {
          onMouseUp: async (p: RRPoint) => {
            const files = await askAndUploadImages();
            if (files === null) {
              return;
            }
            const image = files[0];
            if (!image) {
              return;
            }

            const assetImageAddAction = assetImageAdd({
              name: image.originalFilename,
              description: null,
              tags: [],
              extra: {},

              location: {
                type: "local",
                filename: image.filename,
                mimeType: image.mimeType,
                originalFilename: image.originalFilename,
              },

              type: "image",
              originalFunction: "map",
              blurHash: image.blurHash,
              width: image.width,
              height: image.height,

              playerId: myself.id,
            });

            const mapObjectAddAction = mapObjectAdd(mapId, {
              type: "image",
              height: DEFAULT_BACKGROUND_IMAGE_HEIGHT,
              imageAssetId: assetImageAddAction.payload.id,
              ...create(p),
            });

            dispatch({
              actions: [assetImageAddAction, mapObjectAddAction],
              optimisticKey: `MapToolHandler/add/${mapObjectAddAction.payload.mapObject.id}`,
              syncToServerThrottle: SERVER_SYNC_THROTTLE_TIME,
            });
          },
        };
        break;
      default:
        assertNever(editState);
    }
  } else if (editState.tool === "reveal") {
    toolHandlerRef.current = {
      onMouseDown: (p: RRPoint) => {
        setMousePosition(p);
        setMouseDown(true);
      },
      onMouseMove: (p: RRPoint) => {
        if (mouseDown) {
          setMousePosition(p);
          const size =
            revealToolSize / 2 / (mapViewRef.current?.transform.a ?? 1);
          const stamp = [
            toCap(pointAdd(p, { x: -size, y: -size })),
            toCap(pointAdd(p, { x: -size, y: size })),
            toCap(pointAdd(p, { x: size, y: size })),
            toCap(pointAdd(p, { x: size, y: -size })),
          ];
          setRevealedAreas((shapes) => {
            let shape: RRCapPoint[][];
            if (!shapes || shapes.length < 1) {
              shape = [stamp];
            } else {
              let clip = new Shape(shapes, true);
              if (editState.revealType === "show") {
                clip = clip.union(new Shape([stamp], true));
              } else {
                clip = clip.difference(new Shape([stamp], true));
              }
              shape = clip.paths;
            }
            return shape;
          });
        }
      },
      onMouseUp: (p: RRPoint) => {
        setMouseDown(false);
      },
      onMouseWheel: (delta: number) => {
        if (mouseDown) {
          setRevealToolSize((s) =>
            Math.max(
              s + (delta * 10) / (mapViewRef.current?.transform.a ?? 1),
              35
            )
          );
        }
      },
    };
  } else if (editState.tool === "react") {
    toolHandlerRef.current = {
      onMouseDown: (p: RRPoint) => {
        send({
          type: "reaction",
          point: p,
          code: editState.reactionCode,
          id: rrid<RRMessage>(),
          mapId: mapId,
        });
      },
      onMouseMove: (p: RRPoint) => {
        send({
          type: "reaction",
          point: p,
          code: editState.reactionCode,
          id: rrid<RRMessage>(),
          mapId: mapId,
        });
      },
    };
  } else {
    toolHandlerRef.current = {};
  }

  const scaledRevealSize =
    revealToolSize / (mapViewRef.current?.transform.a ?? 1);
  return [
    useRef({
      onMouseDown: (p: RRPoint) => {
        toolHandlerRef.current.onMouseDown?.(p);
      },
      onMouseMove: (p: RRPoint) => {
        toolHandlerRef.current.onMouseMove?.(p);
      },
      onMouseUp: (p: RRPoint) => {
        toolHandlerRef.current.onMouseUp?.(p);
      },
      onMouseWheel: (delta: number) => {
        toolHandlerRef.current.onMouseWheel?.(delta);
      },
    }).current,
    editState.tool === "reveal" && mouseDown ? (
      <rect
        x={mousePosition.x - scaledRevealSize / 2}
        y={mousePosition.y - scaledRevealSize / 2}
        width={scaledRevealSize}
        height={scaledRevealSize}
        fill={contrastColor}
      />
    ) : null,
  ];
}
