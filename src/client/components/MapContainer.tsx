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
  RRMapObject,
  RRMapObjectID,
  RRPoint,
  RRToken,
  setById,
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
import { rrid, timestamp } from "../../shared/util";
import { useSettings } from "../settings";
import { useMapSelection } from "../mapSelection";

export type MapSnap = "grid-corner" | "grid-center" | "grid" | "none";

export type MapEditState =
  | { tool: "move" }
  | { tool: "measure"; snap: MapSnap }
  | {
      tool: "draw";
      type: "line" | "polygon" | "rectangle" | "circle";
      color: RRColor;
      snap: MapSnap;
    }
  | { tool: "draw"; type: "text" | "freehand"; color: RRColor };

export default function MapContainer({ className }: { className: string }) {
  const myself = useMyself();
  const map = useServerState((s) => byId(s.maps.entities, myself.currentMap)!);
  const dispatch = useServerDispatch();
  const [settings] = useSettings();
  const [selectedMapObjects, setSelectedTokens] = useMapSelection();

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
    (localTokensOnMap) => {
      return selectedMapObjects.flatMap((selectedTokenId) => {
        const mapObjects = byId(localTokensOnMap.entities, selectedTokenId);
        if (!mapObjects) {
          return [];
        }

        return mapObjectUpdate(map.id, {
          id: selectedTokenId,
          changes: {
            position: mapObjects.position,
          },
        });
      });
    },
    100,
    (start, end, t) => {
      const updatedTokensOnMap: Record<RRMapObjectID, RRMapObject> = {};

      entries(end).forEach((e) => {
        const s = byId(start.entities, e.id);
        if (s) {
          setById(updatedTokensOnMap, e.id, {
            ...e,
            position: {
              x: s.position.x + (e.position.x - s.position.x) * t,
              y: s.position.y + (e.position.y - s.position.y) * t,
            },
          });
        }
      });

      return {
        ids: end.ids,
        entities: {
          ...end.entities,
          ...updatedTokensOnMap,
        },
      };
    }
  );

  const handleKeyDown = (e: KeyboardEvent) => {
    function move(positionUpdater: (position: Point) => Point) {
      setLocalObjectsOnMap((mapObjects) => {
        const updatedMapObjects: Record<RRMapObjectID, RRMapObject> = {};
        entries(mapObjects).forEach((each) => {
          if (selectedMapObjects.includes(each.id)) {
            setById(updatedMapObjects, each.id, {
              ...each,
              position: positionUpdater(each.position),
            });
          }
        });

        return {
          ids: mapObjects.ids,
          entities: {
            ...mapObjects.entities,
            ...updatedMapObjects,
          },
        };
      });
    }

    switch (e.key) {
      case "Delete":
        selectedMapObjects.forEach((selectedTokenId) => {
          dispatch(
            mapObjectRemove({ mapId: map.id, mapObjectId: selectedTokenId })
          );
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

  const onMousePositionChanged = useAggregatedDoubleDebounce(
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

  return (
    <div className={className} ref={dropRef}>
      <MapToolbar map={map} setEditState={setEditState} />
      <Map
        gridEnabled={map.gridEnabled}
        backgroundColor={map.backgroundColor}
        myself={myself}
        tokens={tokens}
        editState={editState}
        mousePositions={mousePositions}
        onMousePositionChanged={onMousePositionChanged}
        onMoveTokens={(dx, dy) => {
          setLocalObjectsOnMap((mapObjects) => {
            const updatedTokensOnMap: Record<RRMapObjectID, RRMapObject> = {};
            entries(mapObjects).forEach((each) => {
              if (selectedMapObjects.includes(each.id)) {
                setById(updatedTokensOnMap, each.id, {
                  ...each,
                  position: {
                    x: each.position.x + dx,
                    y: each.position.y + dy,
                  },
                });
              }
            });

            return {
              ids: mapObjects.ids,
              entities: {
                ...mapObjects.entities,
                ...updatedTokensOnMap,
              },
            };
          });
        }}
        transform={transform}
        setTransform={setTransform}
        mapObjects={entries(localMapObjects)}
        selectedObjects={selectedMapObjects}
        onSelectObjects={setSelectedTokens}
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
