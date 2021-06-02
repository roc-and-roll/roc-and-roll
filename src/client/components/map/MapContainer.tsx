import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDrop } from "react-dnd";
import {
  ephermalPlayerUpdate,
  mapObjectAdd,
  mapObjectRemove,
  mapObjectUpdate,
  characterUpdate,
  characterAdd,
  mapUpdate,
} from "../../../shared/actions";
import {
  byId,
  EntityCollection,
  entries,
  EphermalPlayer,
  RRColor,
  RRID,
  RRMapObject,
  RRMapObjectID,
  RRPlayerID,
  RRPoint,
  RRCharacter,
  RRCharacterID,
  setById,
  RRMapID,
  RRObjectVisibility,
  EMPTY_ENTITY_COLLECTION,
} from "../../../shared/state";
import { useMyself } from "../../myself";
import {
  useOptimisticDebouncedLerpedServerUpdate,
  useOptimisticDebouncedServerUpdate,
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
import { assertNever, rrid, timestamp, withDo } from "../../../shared/util";
import { useRRSettings } from "../../settings";
import produce, { Draft } from "immer";
import {
  makePoint,
  pointAdd,
  pointScale,
  pointSubtract,
  snapPointToGrid,
} from "../../point";
import { useMapToolHandler } from "./useMapToolHandler";
import { atomFamily, atom, useRecoilCallback, RecoilState } from "recoil";
import { DebugMapContainerOverlay } from "./DebugMapContainerOverlay";
import { isTriggeredByTextInput } from "../../util";
import { MapMusicIndicator } from "./MapMusicIndicator";

export type MapSnap = "grid-corner" | "grid-center" | "grid" | "none";

export type ToolButtonState = "select" | "tool" | "measure";

export type MapEditState =
  | { tool: "move"; updateColor: RRColor }
  | { tool: "measure"; snap: MapSnap }
  | { tool: "reveal"; revealType: "show" | "hide" }
  | { tool: "react"; reactionCode: string }
  | {
      tool: "draw";
      type: "line" | "polygon" | "rectangle" | "ellipse" | "image";
      color: RRColor;
      snap: MapSnap;
      visibility: RRObjectVisibility;
    }
  | {
      tool: "draw";
      type: "text" | "freehand";
      color: RRColor;
      visibility: RRObjectVisibility;
    };

export const selectedMapObjectsFamily = atomFamily<boolean, RRMapObjectID>({
  key: "SelectedMapObject",
  default: false,
});

export const selectedMapObjectIdsAtom = atom<ReadonlyArray<RRMapObjectID>>({
  key: "SelectedMapObjectIds",
  default: [],
});

export const highlightedCharactersFamily = atomFamily<boolean, RRCharacterID>({
  key: "HighlightedCharacter",
  default: false,
});

export const mapObjectsFamily = atomFamily<RRMapObject | null, RRMapObjectID>({
  key: "MapObject",
  default: null,
});

export const mapObjectIdsAtom = atom<ReadonlyArray<RRMapObjectID>>({
  key: "MapObjectIds",
  default: [],
});

export const tokenFamily = atomFamily<RRCharacter | null, RRCharacterID>({
  key: "Token",
  default: null,
});

export const tokenIdsAtom = atom<ReadonlyArray<RRCharacterID>>({
  key: "TokenIds",
  default: [],
});

export const characterTemplateFamily = atomFamily<
  RRCharacter | null,
  RRCharacterID
>({
  key: "CharacterTemplate",
  default: null,
});

export const characterTemplateIdsAtom = atom<ReadonlyArray<RRCharacterID>>({
  key: "CharacterTemplateIds",
  default: [],
});

export const ephermalPlayersFamily = atomFamily<
  EphermalPlayer | null,
  RRPlayerID
>({
  key: "EphermalPlayer",
  default: null,
});

export const ephermalPlayerIdsAtom = atom<ReadonlyArray<RRPlayerID>>({
  key: "EphermalPlayerIds",
  default: [],
});

export default function MapContainer() {
  const myself = useMyself();
  const map = useServerState((s) => byId(s.maps.entities, myself.currentMap)!);
  const dispatch = useServerDispatch();
  const [settings] = useRRSettings();
  const syncedDebounce = useRef(
    new SyncedDebouncer(CURSOR_POSITION_SYNC_DEBOUNCE)
  );

  const transformRef = useRef<Matrix>(identity());

  const dropRef2 = useRef<HTMLDivElement>(null);

  const getCharacter = useRecoilCallback(
    ({ snapshot }) =>
      (id: RRCharacterID) => {
        return snapshot.getLoadable(tokenFamily(id)).getValue();
      },
    []
  );

  const getTemplateCharacter = useRecoilCallback(
    ({ snapshot }) =>
      (id: RRCharacterID) => {
        return snapshot.getLoadable(characterTemplateFamily(id)).getValue();
      },
    []
  );

  const [, dropRef1] = useDrop<{ id: RRCharacterID | RRMapID }, void, never>(
    () => ({
      accept: ["token", "tokenTemplate", "map"],
      drop: ({ id }, monitor) => {
        const topLeft = dropRef2.current!.getBoundingClientRect();
        const dropPosition = monitor.getClientOffset();
        const x = dropPosition!.x - topLeft.x;
        const y = dropPosition!.y - topLeft.y;
        const point = globalToLocal(transformRef.current, {
          x,
          y,
        });

        if (monitor.getItemType() === "map") {
          const mapId = id as RRMapID;
          dispatch(
            mapObjectAdd(map.id, {
              id: rrid<RRMapObject>(),
              type: "mapLink",
              position: pointSubtract(point, { x: 10, y: 10 }),
              rotation: 0,
              playerId: myself.id,
              mapId,
              locked: false,
              color: "#000",
              visibility: "everyone",
            })
          );
          return;
        }

        let characterId = id as RRCharacterID;

        const character =
          monitor.getItemType() === "tokenTemplate"
            ? getTemplateCharacter(characterId)
            : getCharacter(characterId);

        if (!character) return;

        // first create copy
        if (monitor.getItemType() === "tokenTemplate") {
          const { id: _, ...copy } = character;
          characterId = dispatch(
            characterAdd({
              ...copy,
              localToMap: map.id,
            })
          ).payload.id;
        }

        dispatch(
          mapObjectAdd(map.id, {
            id: rrid<RRMapObject>(),
            type: "token",
            position: snapPointToGrid(point),
            rotation: 0,
            playerId: myself.id,
            characterId,
          })
        );
      },
    }),
    [dispatch, getCharacter, getTemplateCharacter, map.id, myself.id]
  );
  const dropRef = composeRefs<HTMLDivElement>(dropRef2, dropRef1);

  const [localMapObjects, setLocalObjectsOnMap] =
    useOptimisticDebouncedLerpedServerUpdate(
      (state) => {
        return (
          byId(state.maps.entities, myself.currentMap)?.objects ??
          EMPTY_ENTITY_COLLECTION
        );
      },
      useRecoilCallback(
        ({ snapshot }) =>
          (localMapObjects) =>
            snapshot
              .getLoadable(selectedMapObjectIdsAtom)
              .getValue()
              .flatMap((selectedMapObjectId) => {
                const mapObject = byId(
                  localMapObjects.entities,
                  selectedMapObjectId
                );
                if (!mapObject) {
                  return [];
                }

                return mapObjectUpdate(map.id, {
                  id: mapObject.id,
                  changes: {
                    position: mapObject.position,
                  },
                });
              })
      ),
      syncedDebounce.current,
      (start, end, t) =>
        produce(end, (draft) =>
          entries<Draft<RRMapObject>>(end).forEach((e) => {
            const s = byId(start.entities, e.id);
            // Only lerp the position if
            // 1. the object existed before (s)
            // 2. it has changed (s !== e)
            if (s && s !== e) {
              // We deliberately only use the draft here, instead of iterating
              // over it directly, so that less proxies need to be created.
              const obj = byId<Draft<RRMapObject>>(draft.entities, e.id)!;
              obj.position = pointAdd(
                s.position,
                pointScale(pointSubtract(e.position, s.position), t)
              );
            }
          })
        )
    );

  const handleKeyDown = useRecoilCallback(
    ({ snapshot, set, reset }) =>
      (e: KeyboardEvent) => {
        if (isTriggeredByTextInput(e)) {
          return;
        }
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

        let keyHandled = true;
        switch (e.key) {
          case "Delete": {
            dispatch(
              selectedMapObjectIds.map((mapObjectId) => {
                const mapObject = snapshot
                  .getLoadable(mapObjectsFamily(mapObjectId))
                  .getValue()!;
                if (mapObject.type === "token") {
                  const character = snapshot
                    .getLoadable(tokenFamily(mapObject.characterId))
                    .getValue()!;
                  return mapObjectRemove({
                    mapId: map.id,
                    mapObject,
                    relatedCharacter: character,
                  });
                } else {
                  return mapObjectRemove({ mapId: map.id, mapObjectId });
                }
              })
            );
            selectedMapObjectIds.forEach((id) =>
              reset(selectedMapObjectsFamily(id))
            );
            set(selectedMapObjectIdsAtom, []);
            break;
          }
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
          default:
            keyHandled = false;
            break;
        }

        if (keyHandled) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
    [dispatch, map.id, setLocalObjectsOnMap]
  );

  const [editState, setEditState] = useState<MapEditState>({
    tool: "move",
    updateColor: myself.color,
  });

  const updatedColor = editState.tool === "move" && editState.updateColor;
  const onUpdateColor = useRecoilCallback(
    ({ snapshot }) =>
      (color: string) => {
        if (color) {
          dispatch(
            snapshot
              .getLoadable(selectedMapObjectIdsAtom)
              .getValue()
              .flatMap((selectedMapObjectId) => {
                const object = snapshot
                  .getLoadable(mapObjectsFamily(selectedMapObjectId))
                  .getValue();
                if (object && object.type !== "token" && !object.locked) {
                  return mapObjectUpdate(map.id, {
                    id: selectedMapObjectId,
                    changes: { color },
                  });
                } else return [];
              })
          );
        }
      },
    [dispatch, map.id]
  );

  useEffect(() => {
    if (updatedColor) {
      onUpdateColor(updatedColor);
    }
  }, [updatedColor, onUpdateColor]);

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

  const updateMeasurePath = useCallback(
    (measurePath: RRPoint[]) =>
      dispatch(
        ephermalPlayerUpdate({
          id: myself.id,
          changes: {
            measurePath,
          },
        })
      ),
    [dispatch, myself.id]
  );

  const players = useServerState((state) => state.players);

  const convertToolButtonState = (): ToolButtonState => {
    switch (editState.tool) {
      case "move":
        return "select";
      case "draw":
      case "reveal":
      case "react":
        return "tool";
      case "measure":
        return "measure";
      default:
        assertNever(editState);
    }
  };

  const toolButtonState = convertToolButtonState();

  const [revealedAreas, setRevealedAreas] = useOptimisticDebouncedServerUpdate(
    (state) => byId(state.maps.entities, map.id)?.revealedAreas ?? null,
    (areas) =>
      dispatch(mapUpdate({ changes: { revealedAreas: areas }, id: map.id })),
    1000
  );

  const [toolHandler, toolOverlay] = useMapToolHandler(
    myself,
    map,
    editState,
    transformRef,
    {
      setRevealedAreas,
    }
  );

  const onSetHP = useCallback(
    (tokenId: RRCharacterID, hp: number) => {
      dispatch(characterUpdate({ id: tokenId, changes: { hp } }));
    },
    [dispatch]
  );

  const onMoveMapObjectsUpdater = useRecoilCallback(
    ({ snapshot }) =>
      (d: RRPoint, localObjectsOnMap: typeof localMapObjects) => {
        const updatedLocalObjectsOnMap: Record<RRMapObjectID, RRMapObject> = {};

        snapshot
          .getLoadable(selectedMapObjectIdsAtom)
          .getValue()
          .forEach((selectedMapObjectId) => {
            const object = byId<Draft<RRMapObject>>(
              localObjectsOnMap.entities,
              selectedMapObjectId
            );
            if (object && (object.type === "token" || !object.locked)) {
              setById(updatedLocalObjectsOnMap, object.id, {
                ...object,
                position: pointAdd(object.position, d),
              });
            }
          });

        return {
          ...localObjectsOnMap,
          entities: {
            ...localObjectsOnMap.entities,
            ...updatedLocalObjectsOnMap,
          },
        };
      }
    // We don't use the equivalent immmer producer here, because moving
    // objects around the map is very performance critical.
    //
    // produce((draft) => {
    //   snapshot
    //     .getLoadable(selectedMapObjectIdsAtom)
    //     .getValue()
    //     .forEach((selectedMapObjectId) => {
    //       const object = byId<Draft<RRMapObject>>(
    //         draft.entities,
    //         selectedMapObjectId
    //       );
    //       if (object) {
    //         object.position = pointAdd(object.position, d);
    //       }
    //     });
    // })
  );

  // This must not use useRecoilCallback, because the setLocalObjectsOnMap may
  // be batched by React and executed at a later point. If we used
  // useRecoilCallback here, we would still access the old snapshot when the
  // setLocalObjectsOnMap is finally executed by React.
  //
  // To circumvent that problem, we use a separate useRecoilCallback that is
  // executed right when React decides to schedule the state update.
  const onMoveMapObjects = useCallback(
    (d: RRPoint) =>
      setLocalObjectsOnMap((localObjectsOnMap) =>
        onMoveMapObjectsUpdater(d, localObjectsOnMap)
      ),
    [setLocalObjectsOnMap, onMoveMapObjectsUpdater]
  );

  const onStopMoveMapObjectsUpdater = useRecoilCallback(
    ({ snapshot }) =>
      (localObjectsOnMap: typeof localMapObjects) => {
        const updatedLocalObjectsOnMap: Record<RRMapObjectID, RRMapObject> = {};

        snapshot
          .getLoadable(selectedMapObjectIdsAtom)
          .getValue()
          .forEach((selectedMapObjectId) => {
            const object = byId<Draft<RRMapObject>>(
              localObjectsOnMap.entities,
              selectedMapObjectId
            );
            if (object && (object.type === "token" || !object.locked)) {
              const position = withDo(object, (object) => {
                // TODO: We have a "snapping" button in the toolbar, which we
                // should probably respect somehow.
                if (object.type === "token" || object.type === "image") {
                  // TODO: Calculate center based on token / map object size
                  const center = pointAdd(
                    object.position,
                    makePoint(GRID_SIZE / 2)
                  );
                  return snapPointToGrid(center);
                }
                return object.position;
              });

              setById(updatedLocalObjectsOnMap, object.id, {
                ...object,
                position,
              });
            }
          });

        return {
          ...localObjectsOnMap,
          entities: {
            ...localObjectsOnMap.entities,
            ...updatedLocalObjectsOnMap,
          },
        };
      },
    []
  );

  // Refer to the comment on onMoveMapObjects
  const onStopMoveMapObjects = useCallback(
    () => setLocalObjectsOnMap(onStopMoveMapObjectsUpdater),
    [onStopMoveMapObjectsUpdater, setLocalObjectsOnMap]
  );

  return (
    <div ref={dropRef} className="map-container">
      <ReduxToRecoilBridge localMapObjects={localMapObjects} />
      <MapMusicIndicator mapBackgroundColor={map.backgroundColor} />
      <MapToolbar map={map} myself={myself} setEditState={setEditState} />
      <RRMapView
        // map entity data
        mapId={map.id}
        gridEnabled={map.gridEnabled}
        gridColor={map.gridColor}
        backgroundColor={map.backgroundColor}
        // other entities
        myself={myself}
        // toolbar / tool
        toolButtonState={toolButtonState}
        toolHandler={toolHandler}
        // mouse position and token path sync
        measurePathDebounce={syncedDebounce.current}
        onMousePositionChanged={sendMousePositionToServer}
        players={players}
        onUpdateMeasurePath={updateMeasurePath}
        // zoom and position
        transformRef={transformRef}
        // map objects
        onMoveMapObjects={onMoveMapObjects}
        onStopMoveMapObjects={onStopMoveMapObjects}
        onSetHP={onSetHP}
        // misc
        handleKeyDown={handleKeyDown}
        revealedAreas={revealedAreas}
        toolOverlay={toolOverlay}
      />
      {process.env.NODE_ENV === "development" &&
        settings.debug.mapTokenPositions && (
          <DebugMapContainerOverlay
            localMapObjects={entries(localMapObjects)}
            serverMapObjects={entries(map.objects)}
          />
        )}
    </div>
  );
}

function useReduxToRecoilBridge<E extends { id: RRID }>(
  debugIdentifier: string,
  entities: EntityCollection<E>,
  idsAtom: RecoilState<ReadonlyArray<E["id"]>>,
  familyAtom: (id: E["id"]) => RecoilState<E | null>
) {
  const updateRecoilObjects = useRecoilCallback(
    ({ snapshot, set, reset }) =>
      ({ ids: newIds, entities }: EntityCollection<E>) => {
        const oldIds = snapshot.getLoadable(mapObjectIdsAtom).getValue();
        if (oldIds !== newIds) {
          set(idsAtom, newIds);
        }

        newIds.forEach((id) => {
          const atom = familyAtom(id);
          const newEntity = byId(entities, id)!;
          const oldEntity = snapshot.getLoadable(atom).getValue();
          if (!Object.is(newEntity, oldEntity)) {
            set(atom, newEntity);
          }
        });

        oldIds
          .filter((oldId) => !newIds.includes(oldId))
          .forEach((removedId) => {
            reset(familyAtom(removedId));
          });
      },
    [familyAtom, idsAtom]
  );

  useEffect(() => {
    updateRecoilObjects(entities);
  }, [entities, updateRecoilObjects]);
}

function ReduxToRecoilBridge({
  localMapObjects,
}: {
  localMapObjects: EntityCollection<RRMapObject>;
}) {
  useReduxToRecoilBridge(
    "local map objects",
    localMapObjects,
    mapObjectIdsAtom,
    mapObjectsFamily
  );
  useReduxToRecoilBridge(
    "tokens",
    useServerState((s) => s.characters),
    tokenIdsAtom,
    tokenFamily
  );
  useReduxToRecoilBridge(
    "characterTemplates",
    useServerState((s) => s.characterTemplates),
    characterTemplateIdsAtom,
    characterTemplateFamily
  );
  useReduxToRecoilBridge(
    "ephermal players",
    useServerState((s) => s.ephermal.players),
    ephermalPlayerIdsAtom,
    ephermalPlayersFamily
  );

  return null;
}
