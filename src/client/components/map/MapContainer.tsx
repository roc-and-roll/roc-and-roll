import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useDrop } from "react-dnd";
import {
  ephemeralPlayerUpdate,
  mapObjectAdd,
  mapObjectRemove,
  mapObjectUpdate,
  characterUpdate,
  characterAdd,
  mapSettingsUpdate,
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
  RRMapID,
  RRObjectVisibility,
  RRCapPoint,
} from "../../../shared/state";
import { useMyself } from "../../myself";
import {
  useLatest,
  useServerDispatch,
  useServerState,
  useServerStateRef,
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
import {
  DEFAULT_BACKGROUND_IMAGE_HEIGHT,
  GRID_SIZE,
  SYNC_MY_MOUSE_POSITION,
} from "../../../shared/constants";
import { assertNever, rrid, timestamp, withDo } from "../../../shared/util";
import { useRRSettings } from "../../settings";
import {
  makePoint,
  pointAdd,
  pointScale,
  pointSubtract,
  snapPointToGrid,
} from "../../../shared/point";
import { useMapToolHandler } from "./useMapToolHandler";
import { atomFamily, atom, useRecoilCallback, RecoilState } from "recoil";
import { DebugMapContainerOverlay } from "./DebugMapContainerOverlay";
import { changeHPSmartly, isTriggeredByFormElement } from "../../util";
import { MapMusicIndicator } from "./MapMusicIndicator";
import { NativeTypes } from "react-dnd-html5-backend";
import { getImageSize, uploadFiles } from "../../files";
import { MAP_LINK_SIZE } from "./MapLink";

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

type RevealedAreas = RRCapPoint[][] | null;

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

export const ephemeralPlayersFamily = atomFamily<
  EphermalPlayer | null,
  RRPlayerID
>({
  key: "EphermalPlayer",
  default: null,
});

export const ephemeralPlayerIdsAtom = atom<ReadonlyArray<RRPlayerID>>({
  key: "EphermalPlayerIds",
  default: [],
});

export default function MapContainer() {
  const myself = useMyself();
  const map = useServerState((s) => byId(s.maps.entities, myself.currentMap)!);
  const mapId = map.id;
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

  const stateRef = useServerStateRef((state) => state.players);
  const getOwnerOfCharacter = useCallback(
    (characterId: RRCharacterID) =>
      entries(stateRef.current).find((player) =>
        player.characterIds.includes(characterId)
      ),
    [stateRef]
  );

  const addBackgroundImages = async (files: File[], point: RRPoint) => {
    try {
      const uploadedFiles = await uploadFiles(files);

      dispatch(
        await Promise.all(
          uploadedFiles.map(async (uploadedFile, i) => {
            const file = files[i]!;
            return mapObjectAdd(mapId, {
              id: rrid<RRMapObject>(),
              playerId: myself.id,
              color: "black",
              position: pointAdd(point, pointScale(makePoint(GRID_SIZE), i)),
              rotation: 0,
              locked: false,
              visibility: "everyone",

              type: "image",
              height: DEFAULT_BACKGROUND_IMAGE_HEIGHT,
              originalSize: await getImageSize(file),
              image: uploadedFile,
            });
          })
        )
      );
    } catch (err) {
      console.error(err);
      alert("File upload failed.");
    }
  };
  const addBackgroundImagesRef = useLatest(addBackgroundImages);

  const [dropProps, dropRef1] = useDrop<
    { id: RRCharacterID | RRMapID } | { files: File[] },
    void,
    { nativeFileHovered: boolean }
  >(
    () => ({
      accept: ["token", "tokenTemplate", "map", NativeTypes.FILE],
      drop: (item, monitor) => {
        const topLeft = dropRef2.current!.getBoundingClientRect();
        const dropPosition = monitor.getClientOffset();
        const x = dropPosition!.x - topLeft.x;
        const y = dropPosition!.y - topLeft.y;
        const point = globalToLocal(transformRef.current, {
          x,
          y,
        });

        if ("files" in item) {
          void addBackgroundImagesRef.current(item.files, point);
          return;
        }

        if (monitor.getItemType() === "map") {
          dispatch(
            mapObjectAdd(mapId, {
              id: rrid<RRMapObject>(),
              type: "mapLink",
              position: pointSubtract(
                point,
                pointScale(makePoint(MAP_LINK_SIZE), 0.5)
              ),
              rotation: 0,
              playerId: myself.id,
              mapId: item.id as RRMapID,
              locked: false,
              color: "#000",
              visibility: "everyone",
            })
          );
          return;
        }

        let characterId = item.id as RRCharacterID;

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
              localToMap: mapId,
            })
          ).payload.id;
        }

        dispatch(
          mapObjectAdd(mapId, {
            id: rrid<RRMapObject>(),
            type: "token",
            position: snapPointToGrid(point),
            rotation: 0,
            // Always pretend that the player the character belongs to has
            // created the token on the map. Otherwise, characters dragged onto
            // the map by the GM can not be controlled by the player.
            playerId: (getOwnerOfCharacter(characterId) ?? myself).id,
            characterId,
          })
        );
      },
      collect: (monitor) => ({
        nativeFileHovered:
          monitor.canDrop() && monitor.getItemType() === NativeTypes.FILE,
      }),
    }),
    [
      addBackgroundImagesRef,
      dispatch,
      getCharacter,
      getOwnerOfCharacter,
      getTemplateCharacter,
      mapId,
      myself,
    ]
  );
  const dropRef = composeRefs<HTMLDivElement>(dropRef2, dropRef1);

  const handleKeyDown = useRecoilCallback(
    ({ snapshot, set, reset }) =>
      (e: KeyboardEvent) => {
        if (isTriggeredByFormElement(e)) {
          return;
        }
        const selectedMapObjectIds = snapshot
          .getLoadable(selectedMapObjectIdsAtom)
          .getValue();

        function move(updater: (position: RRPoint) => RRPoint) {
          dispatch((state) => {
            const map = byId(state.maps.entities, mapId);
            if (!map) {
              return [];
            }

            return selectedMapObjectIds.flatMap((selectedMapObjectId) => {
              const object = byId(map.objects.entities, selectedMapObjectId);
              if (!object) {
                return [];
              }
              return {
                actions: [
                  mapObjectUpdate(mapId, {
                    id: object.id,
                    changes: { position: updater(object.position) },
                  }),
                ],
                optimisticKey: `${object.id}/position`,
              };
            });
          });
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
                    mapId,
                    mapObject,
                    relatedCharacter: character,
                  });
                } else {
                  return mapObjectRemove({ mapId, mapObjectId });
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
    [dispatch, mapId]
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
                  return mapObjectUpdate(mapId, {
                    id: selectedMapObjectId,
                    changes: { color },
                  });
                } else return [];
              })
          );
        }
      },
    [dispatch, mapId]
  );

  useEffect(() => {
    if (updatedColor) {
      onUpdateColor(updatedColor);
    }
  }, [updatedColor, onUpdateColor]);

  const sendMousePositionToServer = useAggregatedDoubleDebounce(
    useCallback(
      (argHistory: Array<[RRPoint]>) => {
        if (argHistory.length === 0 || !SYNC_MY_MOUSE_POSITION) {
          return;
        }

        const positions = argHistory.map((each) => each[0]);

        const lastPosition = positions[positions.length - 1]!;
        const history = positions.slice(0, positions.length - 1);

        dispatch(
          ephemeralPlayerUpdate({
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
        ephemeralPlayerUpdate({
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

  const setRevealedAreas = useCallback(
    (
      areasOrUpdater: RevealedAreas | ((areas: RevealedAreas) => RevealedAreas)
    ) => {
      dispatch((state) => ({
        actions: [
          mapSettingsUpdate({
            id: mapId,
            changes: {
              revealedAreas:
                typeof areasOrUpdater === "function"
                  ? areasOrUpdater(
                      byId(state.maps.entities, mapId)?.settings
                        .revealedAreas ?? null
                    )
                  : areasOrUpdater,
            },
          }),
        ],
        optimisticKey: "revealedAreas",
      }));
    },
    [dispatch, mapId]
  );

  const [toolHandler, toolOverlay] = useMapToolHandler(
    myself,
    { mapId: map.id, mapBackgroundColor: map.settings.backgroundColor },
    editState,
    transformRef,
    {
      setRevealedAreas,
    }
  );

  const onSmartSetTotalHP = useCallback(
    (tokenId: RRCharacterID, newTotalHP: number) =>
      dispatch((state) => {
        const character = byId(state.characters.entities, tokenId);
        if (!character) {
          return [];
        }

        return {
          actions: [
            characterUpdate({
              id: tokenId,
              changes: changeHPSmartly(character, newTotalHP),
            }),
          ],
          optimisticKey: `${tokenId}/hp`,
        };
      }),
    [dispatch]
  );

  const onMoveMapObjects = useRecoilCallback(
    ({ snapshot }) =>
      (d: RRPoint) => {
        dispatch((state) => {
          const map = byId(state.maps.entities, mapId);
          if (!map) {
            return [];
          }

          return snapshot
            .getLoadable(selectedMapObjectIdsAtom)
            .getValue()
            .flatMap((selectedMapObjectId) => {
              const object = byId(map.objects.entities, selectedMapObjectId);
              if (object && (object.type === "token" || !object.locked)) {
                return {
                  actions: [
                    mapObjectUpdate(mapId, {
                      id: object.id,
                      changes: { position: pointAdd(object.position, d) },
                    }),
                  ],
                  optimisticKey: `${object.id}/position`,
                };
              }

              return [];
            });
        });
      },
    [dispatch, mapId]
  );

  const onStopMoveMapObjects = useRecoilCallback(
    ({ snapshot }) =>
      () =>
        dispatch((state) => {
          const map = byId(state.maps.entities, mapId);
          if (!map) {
            return [];
          }

          return snapshot
            .getLoadable(selectedMapObjectIdsAtom)
            .getValue()
            .flatMap((selectedMapObjectId) => {
              const object = byId(map.objects.entities, selectedMapObjectId);
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

                return {
                  actions: [
                    mapObjectUpdate(mapId, {
                      id: object.id,
                      changes: { position },
                    }),
                  ],
                  optimisticKey: `${object.id}/position`,
                };
              }

              return [];
            });
        }),
    [dispatch, mapId]
  );

  return (
    <div ref={dropRef} className="map-container">
      <ReduxToRecoilBridge mapObjects={map.objects} />
      <MapMusicIndicator mapBackgroundColor={map.settings.backgroundColor} />
      <MapToolbar
        mapId={map.id}
        mapSettings={map.settings}
        myself={myself}
        setEditState={setEditState}
      />
      <RRMapView
        // map entity data
        mapId={map.id}
        gridEnabled={map.settings.gridEnabled}
        gridColor={map.settings.gridColor}
        backgroundColor={map.settings.backgroundColor}
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
        onSmartSetTotalHP={onSmartSetTotalHP}
        // misc
        handleKeyDown={handleKeyDown}
        revealedAreas={map.settings.revealedAreas}
        toolOverlay={toolOverlay}
      />
      {dropProps.nativeFileHovered && <ExternalFileDropIndicator />}
      {process.env.NODE_ENV === "development" &&
        settings.debug.mapTokenPositions && (
          <DebugMapContainerOverlay
            // TODO: This doesn't make sense any longer.
            localMapObjects={entries(map.objects)}
            serverMapObjects={entries(map.objects)}
          />
        )}
    </div>
  );
}

const ExternalFileDropIndicator = React.memo(
  function ExternalFileDropIndicator() {
    return (
      <div className="drop-indicator">
        <div>
          <p>drop background images here</p>
        </div>
      </div>
    );
  }
);

function useReduxToRecoilBridge<E extends { id: RRID }>(
  debugIdentifier: string,
  entities: EntityCollection<E>,
  idsAtom: RecoilState<ReadonlyArray<E["id"]>>,
  familyAtom: (id: E["id"]) => RecoilState<E | null>
) {
  const updateRecoilObjects = useRecoilCallback(
    ({ snapshot, set, reset }) =>
      ({ ids: newIds, entities }: EntityCollection<E>) => {
        const oldIds = snapshot.getLoadable(idsAtom).getValue();
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

  useLayoutEffect(() => {
    updateRecoilObjects(entities);
  }, [entities, updateRecoilObjects]);
}

function ReduxToRecoilBridge({
  mapObjects,
}: {
  mapObjects: EntityCollection<RRMapObject>;
}) {
  useReduxToRecoilBridge(
    "map objects",
    mapObjects,
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
    "ephemeral players",
    useServerState((s) => s.ephemeral.players),
    ephemeralPlayerIdsAtom,
    ephemeralPlayersFamily
  );

  return null;
}
