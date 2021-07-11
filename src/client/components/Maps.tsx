import clsx from "clsx";
import React from "react";
import { useDrag, useDrop } from "react-dnd";
import { mapAdd, mapSettingsUpdate, playerUpdate } from "../../shared/actions";
import { randomColor } from "../../shared/colors";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../shared/constants";
import {
  byId,
  EntityCollection,
  entries,
  RRMapID,
  RRPlayer,
  RRPlayerID,
} from "../../shared/state";
import { EMPTY_ENTITY_COLLECTION } from "../../shared/state";
import { useMyself } from "../myself";
import { useServerDispatch, useServerState } from "../state";
import { GMArea } from "./GMArea";
import { Button } from "./ui/Button";
import { SmartTextInput } from "./ui/TextInput";

export function Maps() {
  const dispatch = useServerDispatch();
  const myself = useMyself();
  const mapIds = useServerState((state) => state.maps.ids);
  const players = useServerState((state) => state.players);

  return (
    <GMArea>
      <ul role="list" className="maps">
        {mapIds.map((mapId) => (
          <MapListEntry
            key={mapId}
            mapId={mapId}
            myself={myself}
            players={players}
            showDragHandle
          />
        ))}
        <li className="maps-create">
          <Button
            onClick={() => {
              const name = prompt("Enter the name of the map")?.trim();
              if (name === undefined || name.length === 0) {
                return;
              }

              dispatch(
                mapAdd({
                  settings: {
                    backgroundColor: randomColor(),
                    gridEnabled: true,
                    gridColor: "#808080",
                    name,
                    revealedAreas: null,
                    gmWorldPosition: { x: 0, y: 0 },
                  },
                  objects: EMPTY_ENTITY_COLLECTION,
                })
              );
            }}
          >
            add new map
          </Button>
        </li>
      </ul>
    </GMArea>
  );
}

export function MapListEntry({
  mapId,
  myself,
  players: allPlayers,
  showDragHandle,
}: {
  mapId: RRMapID;
  myself: RRPlayer;
  players: EntityCollection<RRPlayer>;
  showDragHandle?: boolean;
}) {
  const dispatch = useServerDispatch();
  const players = entries(allPlayers).filter(
    (player) => player.currentMap === mapId
  );
  const mapSettings = useServerState(
    (state) => byId(state.maps.entities, mapId)?.settings
  );
  const isMyCurrentMap = myself.currentMap === mapId;

  const [, dragRef] = useDrag<{ id: RRMapID }, void, null>(() => ({
    type: "map",
    item: { id: mapId },
  }));

  const [{ canDropAndHovered, canDrop }, dropRef] = useDrop<
    { id: RRPlayerID },
    void,
    { canDropAndHovered: boolean; canDrop: boolean }
  >(
    () => ({
      accept: "maps-player",
      drop: (item) => {
        dispatch(playerUpdate({ id: item.id, changes: { currentMap: mapId } }));
      },
      collect: (monitor) => ({
        canDropAndHovered: monitor.isOver() && monitor.canDrop(),
        canDrop: monitor.canDrop(),
      }),
      canDrop: (item) => players.every((player) => player.id !== item.id),
    }),
    [dispatch, mapId, players]
  );

  if (!mapSettings) {
    return null;
  }

  return (
    <li>
      <h3 className="maps-map-title">
        <SmartTextInput
          className="maps-map-name"
          value={mapSettings.name}
          onChange={(name) =>
            dispatch({
              actions: [mapSettingsUpdate({ id: mapId, changes: { name } })],
              optimisticKey: "name",
              syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
            })
          }
        />
        {isMyCurrentMap && (
          <>
            {" "}
            <span className="maps-you-are-here">you are here</span>
          </>
        )}
        {showDragHandle && (
          <div
            title="Drag to create link"
            className="maps-drag-handle"
            ref={dragRef}
          ></div>
        )}
      </h3>
      <div
        className={clsx(
          "maps-players",
          canDropAndHovered && "maps-players-hovered",
          canDrop && "maps-players-can-drop"
        )}
        ref={dropRef}
      >
        {players.map((player) => (
          <MapPlayer key={player.id} player={player} />
        ))}
        {players.length === 0 && (
          <div className="maps-no-players">drop players here</div>
        )}
      </div>
      <div>
        {allPlayers.ids.length !== players.length && (
          <Button
            onClick={() =>
              dispatch(
                allPlayers.ids.map((id) =>
                  playerUpdate({ id, changes: { currentMap: mapId } })
                )
              )
            }
          >
            move everyone here
          </Button>
        )}
        {!isMyCurrentMap && (
          <Button
            onClick={() =>
              dispatch(
                playerUpdate({
                  id: myself.id,
                  changes: { currentMap: mapId },
                })
              )
            }
          >
            go here
          </Button>
        )}
      </div>
    </li>
  );
}

function MapPlayer({ player }: { player: RRPlayer }) {
  const [, dragRef] = useDrag(
    () => ({
      type: "maps-player",
      item: { id: player.id },
      options: {
        dropEffect: "move",
      },
    }),
    [player.id]
  );

  return (
    <span key={player.id} className="map-player" ref={dragRef}>
      {player.name}
    </span>
  );
}
