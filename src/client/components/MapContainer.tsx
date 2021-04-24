import React, { useCallback, useRef, useState } from "react";
import { useDrop } from "react-dnd";
import {
  ephermalPlayerUpdate,
  mapTokenAdd,
  mapTokenRemove,
  mapTokenUpdate,
} from "../../shared/actions";
import {
  byId,
  entries,
  RRColor,
  RRPoint,
  RRToken,
  RRTokenOnMap,
  RRTokenOnMapID,
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
import { timestamp } from "../../shared/util";

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

export function MapContainer({ className }: { className: string }) {
  const myself = useMyself();
  const map = useServerState((s) => byId(s.maps.entities, myself.currentMap)!);
  const dispatch = useServerDispatch();

  const [selectedTokens, setSelectedTokens] = useState<RRTokenOnMapID[]>([]);
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
          mapTokenAdd(map.id, {
            position: snapPointToGrid(
              globalToLocal(transform, {
                x,
                y,
              })
            ),
            tokenId: item.id,
          })
        );
      },
    }),
    [dispatch, map.id, transform]
  );
  const dropRef = composeRefs<HTMLDivElement>(dropRef2, dropRef1);

  const serverTokensOnMap = map.tokens;
  const [localTokensOnMap, setLocalTokensOnMap] = useDebouncedServerUpdate(
    serverTokensOnMap,
    (localTokensOnMap) => {
      return selectedTokens.flatMap((selectedTokenId) => {
        const tokenOnMap = byId(localTokensOnMap.entities, selectedTokenId);
        if (!tokenOnMap) {
          return [];
        }

        return mapTokenUpdate(map.id, {
          id: selectedTokenId,
          changes: {
            position: tokenOnMap.position,
          },
        });
      });
    },
    100,
    (start, end, t) => {
      const updatedTokensOnMap: Record<RRTokenOnMapID, RRTokenOnMap> = {};

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
      setLocalTokensOnMap((tokensOnMap) => {
        const updatedTokensOnMap: Record<RRTokenOnMapID, RRTokenOnMap> = {};
        entries(tokensOnMap).forEach((each) => {
          if (selectedTokens.includes(each.id)) {
            setById(updatedTokensOnMap, each.id, {
              ...each,
              position: positionUpdater(each.position),
            });
          }
        });

        return {
          ids: tokensOnMap.ids,
          entities: {
            ...tokensOnMap.entities,
            ...updatedTokensOnMap,
          },
        };
      });
    }

    switch (e.key) {
      case "Delete":
        selectedTokens.forEach((selectedTokenId) => {
          dispatch(
            mapTokenRemove({ mapId: map.id, tokenOnMapId: selectedTokenId })
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
          setLocalTokensOnMap((tokensOnMap) => {
            const updatedTokensOnMap: Record<RRTokenOnMapID, RRTokenOnMap> = {};
            entries(tokensOnMap).forEach((each) => {
              if (selectedTokens.includes(each.id)) {
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
              ids: tokensOnMap.ids,
              entities: {
                ...tokensOnMap.entities,
                ...updatedTokensOnMap,
              },
            };
          });
        }}
        transform={transform}
        setTransform={setTransform}
        tokensOnMap={entries(localTokensOnMap)}
        selectedTokens={selectedTokens}
        onSelectTokens={setSelectedTokens}
        handleKeyDown={handleKeyDown}
      />
      {false && process.env.NODE_ENV === "development" && (
        <DebugTokenPositions
          localTokensOnMap={entries(localTokensOnMap)}
          serverTokensOnMap={entries(serverTokensOnMap)}
        />
      )}
    </div>
  );
}

function DebugTokenPositions(props: {
  localTokensOnMap: RRTokenOnMap[];
  serverTokensOnMap: RRTokenOnMap[];
}) {
  const tokenOnMapIds = [
    ...new Set([
      ...props.localTokensOnMap.map((t) => t.id),
      ...props.serverTokensOnMap.map((t) => t.id),
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
      <h3>Debug: token positions</h3>
      <table cellPadding={8}>
        <thead>
          <tr>
            <th>RRTokenOnMapID</th>
            <th>Server .position</th>
            <th>Local .position</th>
            <th>Diff .position</th>
          </tr>
        </thead>
        <tbody>
          {tokenOnMapIds.map((tokenOnMapId) => {
            const serverTokenOnMap =
              props.serverTokensOnMap.find(
                (each) => each.id === tokenOnMapId
              ) ?? null;
            const localTokenOnMap =
              props.localTokensOnMap.find((each) => each.id === tokenOnMapId) ??
              null;
            return (
              <tr key={tokenOnMapId}>
                <td>{tokenOnMapId}</td>
                <td>
                  x: {serverTokenOnMap?.position.x}
                  <br />
                  y: {serverTokenOnMap?.position.y}
                </td>
                <td>
                  x: {localTokenOnMap?.position.x}
                  <br />
                  y: {localTokenOnMap?.position.y}
                </td>
                <td>
                  {localTokenOnMap && serverTokenOnMap && (
                    <>
                      x:{" "}
                      {localTokenOnMap.position.x - serverTokenOnMap.position.x}
                      <br />
                      y:{" "}
                      {localTokenOnMap.position.y - serverTokenOnMap.position.y}
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
