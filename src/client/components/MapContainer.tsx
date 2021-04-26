import React, { useCallback, useRef, useState } from "react";
import { useDrop } from "react-dnd";
import {
  ephermalPlayerUpdate,
  mapObjectAdd,
  mapObjectRemove,
  mapObjectUpdate,
} from "../../shared/actions";
import {
  byId,
  entries,
  RRColor,
  RRMap,
  RRMapDrawingBase,
  RRMapObject,
  RRMapObjectID,
  RRPlayer,
  RRPoint,
  RRToken,
} from "../../shared/state";
import { useMyself } from "../myself";
import {
  useDebouncedServerUpdate,
  useServerDispatch,
  useServerState,
} from "../state";
import { useAggregatedDoubleDebounce } from "../useDebounce";
import {
  CURSOR_POSITION_SYNC_DEBOUNCE,
  CURSOR_POSITION_SYNC_HISTORY_STEPS,
  globalToLocal,
  Map,
  Point,
  snapPointToGrid,
} from "./Map";
import composeRefs from "@seznam/compose-react-refs";
import { identity, Matrix } from "transformation-matrix";
import { MapToolbar } from "./MapToolbar";
import { GRID_SIZE } from "../../shared/constants";
import { assertNever, rrid, timestamp } from "../../shared/util";
import { useSettings } from "../settings";
import { useMapSelection } from "../mapSelection";
import produce, { Draft } from "immer";

export type MapSnap = "grid-corner" | "grid-center" | "grid" | "none";

export type ToolButtonState = "select" | "tool";

export type MapEditState =
  | { tool: "move" }
  | { tool: "measure"; snap: MapSnap }
  | {
      tool: "draw";
      type: "line" | "polygon" | "rectangle" | "ellipse";
      color: RRColor;
      snap: MapSnap;
    }
  | { tool: "draw"; type: "text" | "freehand"; color: RRColor };

export default function MapContainer({ className }: { className: string }) {
  const myself = useMyself();
  const map = useServerState((s) => byId(s.maps.entities, myself.currentMap)!);
  const dispatch = useServerDispatch();
  const [settings] = useSettings();
  const [selectedMapObjectIds, setSelectedMapObjectIds] = useMapSelection();

  const [transform, setTransform] = useState<Matrix>(identity());

  const dropRef2 = useRef<HTMLDivElement>(null);
  const [, dropRef1] = useDrop<RRToken, void, never>(
    () => ({
      accept: "token",
      drop: (item, monitor) => {
        const topLeft = dropRef2.current!.getBoundingClientRect();
        const dropPosition = monitor.getClientOffset();
        const x = dropPosition!.x - topLeft.x;
        const y = dropPosition!.y - topLeft.y;

        dispatch(
          mapObjectAdd(map.id, {
            id: rrid<RRMapObject>(),
            type: "token",
            position: snapPointToGrid(
              globalToLocal(transform, {
                x,
                y,
              })
            ),
            playerId: myself.id,
            tokenId: item.id,
          })
        );
      },
    }),
    [dispatch, map.id, myself.id, transform]
  );
  const dropRef = composeRefs<HTMLDivElement>(dropRef2, dropRef1);

  const serverMapObjects = map.objects;
  const [localMapObjects, setLocalObjectsOnMap] = useDebouncedServerUpdate(
    serverMapObjects,
    (localMapObjects) => {
      return selectedMapObjectIds.flatMap((selectMapObjectId) => {
        const mapObject = byId(localMapObjects.entities, selectMapObjectId);
        if (!mapObject) {
          return [];
        }

        return mapObjectUpdate(map.id, {
          id: selectMapObjectId,
          changes: {
            position: mapObject.position,
          },
        });
      });
    },
    100,
    (start, end, t) =>
      produce(end, (draft) =>
        entries<Draft<RRMapObject>>(draft).forEach((e) => {
          const s = byId(start.entities, e.id);
          if (s) {
            e.position = {
              x: s.position.x + (e.position.x - s.position.x) * t,
              y: s.position.y + (e.position.y - s.position.y) * t,
            };
          }
        })
      )
  );

  const handleKeyDown = (e: KeyboardEvent) => {
    function move(positionUpdater: (position: Point) => Point) {
      setLocalObjectsOnMap(
        produce((draft) => {
          selectedMapObjectIds.forEach((selectedMapObjectId) => {
            const object = byId<Draft<RRMapObject>>(
              draft.entities,
              selectedMapObjectId
            );
            if (object) {
              object.position = positionUpdater(object.position);
            }
          });
        })
      );
    }

    switch (e.key) {
      case "Delete":
        selectedMapObjectIds.forEach((mapObjectId) => {
          dispatch(mapObjectRemove({ mapId: map.id, mapObjectId }));
        });
        break;
      case "ArrowLeft":
        move((position) => ({ x: position.x - GRID_SIZE, y: position.y }));
        break;
      case "ArrowRight":
        move((position) => ({ x: position.x + GRID_SIZE, y: position.y }));
        break;
      case "ArrowUp":
        move((position) => ({ x: position.x, y: position.y - GRID_SIZE }));
        break;
      case "ArrowDown":
        move((position) => ({ x: position.x, y: position.y + GRID_SIZE }));
        break;
    }
  };

  const tokens = useServerState((s) => s.tokens);

  const [editState, setEditState] = useState<MapEditState>({ tool: "move" });

  const sendMousePositionToServer = useAggregatedDoubleDebounce(
    useCallback(
      (argHistory: Array<[RRPoint]>) => {
        if (argHistory.length === 0) {
          return;
        }

        const positions = argHistory.map((each) => each[0]);

        const lastPosition = positions[positions.length - 1]!;
        const history = positions.slice(0, positions.length - 1);

        dispatch(
          ephermalPlayerUpdate({
            id: myself.id,
            changes: {
              mapMouse: {
                position: lastPosition,
                lastUpdate: timestamp(),
                positionHistory: history,
              },
            },
          })
        );
      },
      [dispatch, myself.id]
    ),
    CURSOR_POSITION_SYNC_DEBOUNCE,
    CURSOR_POSITION_SYNC_HISTORY_STEPS
  );

  const players = useServerState((state) => state.players);
  const ephermalPlayers = useServerState((state) => state.ephermal.players);
  const mousePositions = entries(ephermalPlayers).flatMap((each) => {
    if (each.mapMouse === null || each.id === myself.id) {
      return [];
    }
    const player = byId(players.entities, each.id);
    if (!player) {
      return [];
    }

    return {
      playerId: each.id,
      playerName: player.name,
      playerColor: player.color,
      position: each.mapMouse.position,
      positionHistory: each.mapMouse.positionHistory,
    };
  });

  const editStateToToolButtonState = (): ToolButtonState => {
    if (editState.tool === "move") return "select";
    if (editState.tool === "draw") return "tool";
    // TODO adapt for measure
    return "select";
  };

  const mapMouseHandler = CreateMapMouseHandler(
    myself,
    map,
    editState,
    transform.a
  );

  return (
    <div className={className} ref={dropRef}>
      <MapToolbar map={map} setEditState={setEditState} />
      <Map
        // map entity data
        gridEnabled={map.gridEnabled}
        backgroundColor={map.backgroundColor}
        // other entities
        myself={myself}
        tokens={tokens}
        // toolbar / tool
        toolButtonState={editStateToToolButtonState()}
        toolHandler={mapMouseHandler}
        // mouse position sync
        onMousePositionChanged={sendMousePositionToServer}
        mousePositions={mousePositions}
        // zoom and position
        transform={transform}
        setTransform={setTransform}
        // map objects
        mapObjects={entries(localMapObjects)}
        selectedObjects={selectedMapObjectIds}
        onSelectObjects={setSelectedMapObjectIds}
        onMoveMapObjects={(dx, dy) => {
          setLocalObjectsOnMap(
            produce((draft) => {
              selectedMapObjectIds.forEach((selectedMapObjectId) => {
                const object = byId<Draft<RRMapObject>>(
                  draft.entities,
                  selectedMapObjectId
                );
                if (object) {
                  object.position = {
                    x: object.position.x + dx,
                    y: object.position.y + dy,
                  };
                }
              });
            })
          );
        }}
        // misc
        handleKeyDown={handleKeyDown}
      />
      {process.env.NODE_ENV === "development" &&
        settings.debug.mapTokenPositions && (
          <DebugTokenPositions
            localMapObjects={entries(localMapObjects)}
            serverMapObjects={entries(serverMapObjects)}
          />
        )}
    </div>
  );
}

const pointSubtract = (p1: RRPoint, p2: RRPoint) => ({
  x: p1.x - p2.x,
  y: p1.y - p2.y,
});
const pointEquals = (p1: RRPoint, p2: RRPoint) =>
  p1.x === p2.x && p1.y === p2.y;

export interface MapMouseHandler {
  onMouseDown: (p: RRPoint) => void;
  onMouseMove: (p: RRPoint) => void;
  onMouseUp: (p: RRPoint) => void;
}

// Thin points using the idea described here
// https://jackschaedler.github.io/handwriting-recognition/
function thin(points: ReadonlyArray<RRPoint>, squareSize: number) {
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
function CreateMapMouseHandler(
  myself: RRPlayer,
  map: RRMap,
  editState: MapEditState,
  zoom: number
): MapMouseHandler {
  const dispatch = useServerDispatch();

  const [currentId, setCurrentId] = useState<RRMapObjectID | null>(null);

  const startMousePositionRef = useRef<RRPoint>({
    x: 0,
    y: 0,
  });
  const pointsRef = useRef<RRPoint[]>([]);

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
        return {
          onMouseDown: (p: RRPoint) => {
            startMousePositionRef.current = p;
            setCurrentId(
              dispatch(
                mapObjectAdd(map.id, {
                  type: "rectangle",
                  size: { x: 0, y: 0 },
                  ...create(p),
                })
              ).payload.mapObject.id
            );
          },
          onMouseMove: (p: RRPoint) => {
            if (currentId) {
              dispatch(
                mapObjectUpdate(map.id, {
                  id: currentId,
                  changes: {
                    size: pointSubtract(p, startMousePositionRef.current),
                  },
                })
              );
            }
          },
          onMouseUp: (p: RRPoint) => {
            if (currentId && pointEquals(startMousePositionRef.current, p)) {
              dispatch(
                mapObjectRemove({ mapId: map.id, mapObjectId: currentId })
              );
            }
            setCurrentId(null);
          },
        };
      case "ellipse":
        return {
          onMouseDown: (p: RRPoint) => {
            startMousePositionRef.current = p;
            setCurrentId(
              dispatch(
                mapObjectAdd(map.id, {
                  type: "ellipse",
                  size: { x: 0, y: 0 },
                  ...create(p),
                })
              ).payload.mapObject.id
            );
          },
          onMouseMove: (p: RRPoint) => {
            if (currentId) {
              dispatch(
                mapObjectUpdate(map.id, {
                  id: currentId,
                  changes: {
                    size: pointSubtract(p, startMousePositionRef.current),
                  },
                })
              );
            }
          },
          onMouseUp: (p: RRPoint) => {
            if (currentId && pointEquals(startMousePositionRef.current, p)) {
              dispatch(
                mapObjectRemove({ mapId: map.id, mapObjectId: currentId })
              );
            }
            setCurrentId(null);
          },
        };
      case "line":
        return {
          onMouseDown: (p: RRPoint) => {
            startMousePositionRef.current = p;
            setCurrentId(
              dispatch(
                mapObjectAdd(map.id, {
                  type: "freehand",
                  points: [{ x: 0, y: 0 }],
                  ...create(p),
                })
              ).payload.mapObject.id
            );
          },
          onMouseMove: (p: RRPoint) => {
            if (currentId) {
              dispatch(
                mapObjectUpdate(map.id, {
                  id: currentId,
                  changes: {
                    points: [pointSubtract(p, startMousePositionRef.current)],
                  },
                })
              );
            }
          },
          onMouseUp: (p: RRPoint) => {
            if (currentId && pointEquals(startMousePositionRef.current, p)) {
              dispatch(
                mapObjectRemove({ mapId: map.id, mapObjectId: currentId })
              );
            }
            setCurrentId(null);
          },
        };
      case "text":
        return {
          onMouseDown: (p: RRPoint) => {},
          onMouseMove: (p: RRPoint) => {},
          onMouseUp: (p: RRPoint) => {
            const text = prompt("enter text")?.trim();
            if (text === undefined || text.length === 0) {
              return;
            }
            setCurrentId(
              dispatch(
                mapObjectAdd(map.id, {
                  type: "text",
                  text,
                  ...create(p),
                })
              ).payload.mapObject.id
            );
          },
        };
      case "polygon":
      case "freehand":
        return {
          onMouseDown: (p: RRPoint) => {
            startMousePositionRef.current = p;
            pointsRef.current = [];
            setCurrentId(
              dispatch(
                mapObjectAdd(map.id, {
                  type: editState.type === "freehand" ? "freehand" : "polygon",
                  points: [],
                  ...create(p),
                })
              ).payload.mapObject.id
            );
          },
          onMouseMove: (p: RRPoint) => {
            if (currentId) {
              const oldNumPoints = pointsRef.current.length;
              pointsRef.current = thin(
                [
                  ...pointsRef.current,
                  pointSubtract(p, startMousePositionRef.current),
                ],
                GRID_SIZE / 4 / zoom
              );

              if (oldNumPoints !== pointsRef.current.length) {
                dispatch(
                  mapObjectUpdate(map.id, {
                    id: currentId,
                    changes: {
                      points: [...pointsRef.current],
                    },
                  })
                );
              }
            }
          },
          onMouseUp: (p: RRPoint) => {
            if (currentId && pointsRef.current.length === 0) {
              dispatch(
                mapObjectRemove({ mapId: map.id, mapObjectId: currentId })
              );
            }
            setCurrentId(null);
          },
        };
      default:
        assertNever(editState);
    }
  }

  return {
    onMouseDown: (p: RRPoint) => {},
    onMouseMove: (p: RRPoint) => {},
    onMouseUp: (p: RRPoint) => {},
  };
}

function DebugTokenPositions(props: {
  localMapObjects: RRMapObject[];
  serverMapObjects: RRMapObject[];
}) {
  const mapObjectIds = [
    ...new Set([
      ...props.localMapObjects.map((t) => t.id),
      ...props.serverMapObjects.map((t) => t.id),
    ]),
  ];
  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        top: 0,
        background: "orange",
        maxWidth: "100%",
      }}
    >
      <h3>Debug: map object positions</h3>
      <table cellPadding={8}>
        <thead>
          <tr>
            <th>RRMapObjectID</th>
            <th>Server .position</th>
            <th>Local .position</th>
            <th>Diff .position</th>
          </tr>
        </thead>
        <tbody>
          {mapObjectIds.map((mapObjectId) => {
            const serverMapObject =
              props.serverMapObjects.find((each) => each.id === mapObjectId) ??
              null;
            const localMapObject =
              props.localMapObjects.find((each) => each.id === mapObjectId) ??
              null;
            return (
              <tr key={mapObjectId}>
                <td>{mapObjectId}</td>
                <td>
                  x: {serverMapObject?.position.x}
                  <br />
                  y: {serverMapObject?.position.y}
                </td>
                <td>
                  x: {localMapObject?.position.x}
                  <br />
                  y: {localMapObject?.position.y}
                </td>
                <td>
                  {localMapObject && serverMapObject && (
                    <>
                      x:{" "}
                      {localMapObject.position.x - serverMapObject.position.x}
                      <br />
                      y:{" "}
                      {localMapObject.position.y - serverMapObject.position.y}
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
