import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDrop } from "react-dnd";
import {
  ephermalPlayerUpdate,
  mapObjectAdd,
  mapObjectRemove,
  mapObjectUpdate,
  tokenUpdate,
} from "../../../shared/actions";
import {
  byId,
  EntityCollection,
  entries,
  RRColor,
  RRID,
  RRMapObject,
  RRMapObjectID,
  RRPoint,
  RRToken,
  RRTokenID,
} from "../../../shared/state";
import { useMyself } from "../../myself";
import {
  useDebouncedServerUpdate,
  useServerDispatch,
  useServerState,
} from "../../state";
import { SyncedDebouncer, useAggregatedDoubleDebounce } from "../../debounce";
import {
  CURSOR_POSITION_SYNC_DEBOUNCE,
  CURSOR_POSITION_SYNC_HISTORY_STEPS,
  globalToLocal,
  RRMapView,
} from "./Map";
import composeRefs from "@seznam/compose-react-refs";
import { identity, Matrix } from "transformation-matrix";
import { MapToolbar } from "../MapToolbar";
import { GRID_SIZE } from "../../../shared/constants";
import { rrid, timestamp } from "../../../shared/util";
import { useSettings } from "../../settings";
import produce, { Draft } from "immer";
import { pointAdd, snapPointToGrid } from "../../point";
import { CreateMapMouseHandler } from "./CreateMapMouseHandler";
import { useRefState } from "../../useRefState";
import { atomFamily, atom, useRecoilCallback, RecoilState } from "recoil";

export type MapSnap = "grid-corner" | "grid-center" | "grid" | "none";

export type ToolButtonState = "select" | "tool";

export type MapEditState =
  | { tool: "move" }
  | { tool: "measure"; snap: MapSnap }
  | {
      tool: "draw";
      type: "line" | "polygon" | "rectangle" | "ellipse" | "image";
      color: RRColor;
      snap: MapSnap;
    }
  | { tool: "draw"; type: "text" | "freehand"; color: RRColor };

export const selectedMapObjectsFamily = atomFamily<boolean, RRMapObjectID>({
  key: "SelectedMapObject",
  default: false,
});

export const selectedMapObjectIdsAtom = atom<RRMapObjectID[]>({
  key: "SelectedMapObjectIds",
  default: [],
});

export const mapObjectsFamily = atomFamily<RRMapObject | null, RRMapObjectID>({
  key: "MapObject",
  default: null,
});

export const mapObjectIdsAtom = atom<RRMapObjectID[]>({
  key: "MapObjectIds",
  default: [],
});

export const tokenFamily = atomFamily<RRToken | null, RRTokenID>({
  key: "Token",
  default: null,
});

export const tokenIdsAtom = atom<RRTokenID[]>({
  key: "TokenIds",
  default: [],
});

function useReduxToRecoilBridge<E extends { id: RRID }>(
  entities: EntityCollection<E>,
  idsAtom: RecoilState<E["id"][]>,
  familyAtom: (id: E["id"]) => RecoilState<E | null>
) {
  const updateRecoilObjects = useRecoilCallback(
    ({ snapshot, set, reset }) => ({
      ids: newIds,
      entities,
    }: EntityCollection<E>) => {
      const oldIds = snapshot.getLoadable(mapObjectIdsAtom).getValue();
      if (oldIds !== newIds) {
        oldIds.forEach((oldMapObjectId) => {
          reset(familyAtom(oldMapObjectId));
        });
        set(idsAtom, newIds);
      }

      newIds.forEach((id) => set(familyAtom(id), byId(entities, id)!));
    },
    [familyAtom, idsAtom]
  );

  useEffect(() => {
    updateRecoilObjects(entities);
  }, [entities, updateRecoilObjects]);
}

export default function MapContainer() {
  const myself = useMyself();
  const map = useServerState((s) => byId(s.maps.entities, myself.currentMap)!);
  const dispatch = useServerDispatch();
  const [settings] = useSettings();
  const syncedDebounce = useRef(
    new SyncedDebouncer(CURSOR_POSITION_SYNC_DEBOUNCE)
  );

  const [transform, transformRef, setTransform] = useRefState<Matrix>(
    identity()
  );

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
              globalToLocal(transformRef.current, {
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
    [dispatch, map.id, myself.id, transformRef]
  );
  const dropRef = composeRefs<HTMLDivElement>(dropRef2, dropRef1);

  const serverMapObjects = map.objects;
  const [localMapObjects, setLocalObjectsOnMap] = useDebouncedServerUpdate(
    serverMapObjects,
    useRecoilCallback(({ snapshot }) => (localMapObjects) => {
      return snapshot
        .getLoadable(selectedMapObjectIdsAtom)
        .getValue()
        .flatMap((selectMapObjectId) => {
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
    }),
    syncedDebounce.current,
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

  const handleKeyDown = useRecoilCallback(
    ({ snapshot }) => (e: KeyboardEvent) => {
      const selectedMapObjectIds = snapshot
        .getLoadable(selectedMapObjectIdsAtom)
        .getValue();

      function move(positionUpdater: (position: RRPoint) => RRPoint) {
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
    },
    [dispatch, map.id, setLocalObjectsOnMap]
  );

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
    syncedDebounce.current,
    CURSOR_POSITION_SYNC_HISTORY_STEPS,
    true
  );

  const updateTokenPath = useCallback(
    (tokenPath: RRPoint[]) =>
      dispatch(
        ephermalPlayerUpdate({
          id: myself.id,
          changes: {
            tokenPath,
          },
        })
      ),
    [dispatch, myself.id]
  );

  const players = useServerState((state) => state.players);
  const ephermalPlayers = useServerState((state) => state.ephermal.players);

  const toolButtonState: ToolButtonState =
    editState.tool === "move"
      ? "select"
      : editState.tool === "draw"
      ? "tool"
      : // TODO adapt for measure
        "select";

  const mapMouseHandler = CreateMapMouseHandler(
    myself,
    map,
    editState,
    transform.a
  );

  const onSetHP = useCallback(
    (tokenId: RRTokenID, hp: number) => {
      dispatch(tokenUpdate({ id: tokenId, changes: { hp } }));
    },
    [dispatch]
  );
  const onMoveMapObjects = useRecoilCallback(
    ({ snapshot }) => (d: RRPoint) => {
      setLocalObjectsOnMap(
        produce((draft) => {
          snapshot
            .getLoadable(selectedMapObjectIdsAtom)
            .getValue()
            .forEach((selectedMapObjectId) => {
              const object = byId<Draft<RRMapObject>>(
                draft.entities,
                selectedMapObjectId
              );
              if (object) {
                object.position = pointAdd(object.position, d);
              }
            });
        })
      );
    },
    [setLocalObjectsOnMap]
  );

  useReduxToRecoilBridge(localMapObjects, mapObjectIdsAtom, mapObjectsFamily);
  useReduxToRecoilBridge(
    useServerState((s) => s.tokens),
    tokenIdsAtom,
    tokenFamily
  );

  return (
    <div className="app-map" ref={dropRef}>
      <MapToolbar map={map} myself={myself} setEditState={setEditState} />
      <RRMapView
        // map entity data
        mapId={map.id}
        gridEnabled={map.gridEnabled}
        backgroundColor={map.backgroundColor}
        // other entities
        myself={myself}
        // toolbar / tool
        toolButtonState={toolButtonState}
        toolHandler={mapMouseHandler}
        // mouse position and token path sync
        tokenPathSyncedDebouncer={syncedDebounce.current}
        onMousePositionChanged={sendMousePositionToServer}
        players={ephermalPlayers}
        onUpdateTokenPath={updateTokenPath}
        playerData={
          new Map(
            entries(players).map((p) => [
              p.id,
              { name: p.name, color: p.color, mapId: p.currentMap },
            ])
          )
        }
        // zoom and position
        transform={transform}
        setTransform={setTransform}
        // map objects
        onMoveMapObjects={onMoveMapObjects}
        onSetHP={onSetHP}
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
        overflowY: "auto",
        maxHeight: "100vh",
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
