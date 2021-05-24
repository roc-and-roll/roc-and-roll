import clsx from "clsx";
import React from "react";
import { useDrag, useDrop } from "react-dnd";
import { mapAdd, mapUpdate, playerUpdate } from "../../shared/actions";
import { randomColor } from "../../shared/colors";
import {
  byId,
  EntityCollection,
  entries,
  RRMap,
  RRMapID,
  RRPlayer,
  RRPlayerID,
} from "../../shared/state";
import { EMPTY_ENTITY_COLLECTION } from "../../shared/state";
import { useMyself } from "../myself";
import {
  useOptimisticDebouncedServerUpdate,
  useServerDispatch,
  useServerState,
} from "../state";
import { GMArea } from "./GMArea";
import { Button } from "./ui/Button";

export function Maps() {
  const dispatch = useServerDispatch();
  const myself = useMyself();
  const maps = useServerState((state) => state.maps);
  const players = useServerState((state) => state.players);

  return (
    <GMArea>
      <ul role="list" className="maps">
        {entries(maps).map((map) => (
          <MapListEntry
            key={map.id}
            map={map}
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
                  backgroundColor: randomColor(),
                  gridEnabled: true,
                  gridColor: "#808080",
                  name,
                  objects: EMPTY_ENTITY_COLLECTION,
                  revealedAreas: null,
                  gmWorldPosition: { x: 0, y: 0 },
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
  map,
  myself,
  players: allPlayers,
  showDragHandle,
}: {
  map: RRMap;
  myself: RRPlayer;
  players: EntityCollection<RRPlayer>;
  showDragHandle?: boolean;
}) {
  const dispatch = useServerDispatch();
  const players = entries(allPlayers).filter(
    (player) => player.currentMap === map.id
  );
  const isMyCurrentMap = myself.currentMap === map.id;

  const [, dragRef] = useDrag<{ id: RRMapID }, void, null>(() => ({
    type: "map",
    item: { id: map.id },
  }));

  const [name, setName] = useOptimisticDebouncedServerUpdate(
    (state) => byId(state.maps.entities, map.id)?.name ?? "",
    (name) => dispatch(mapUpdate({ id: map.id, changes: { name } })),
    1000
  );

  const [{ canDropAndHovered, canDrop }, dropRef] = useDrop<
    { id: RRPlayerID },
    void,
    { canDropAndHovered: boolean; canDrop: boolean }
  >(
    () => ({
      accept: "maps-player",
      drop: (item) => {
        dispatch(
          playerUpdate({ id: item.id, changes: { currentMap: map.id } })
        );
      },
      collect: (monitor) => ({
        canDropAndHovered: monitor.isOver() && monitor.canDrop(),
        canDrop: monitor.canDrop(),
      }),
      canDrop: (item) => players.every((player) => player.id !== item.id),
    }),
    [dispatch, map.id, players]
  );

  return (
    <li>
      <h3 className="maps-map-title">
        <input
          className="maps-map-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
                  playerUpdate({ id, changes: { currentMap: map.id } })
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
                  changes: { currentMap: map.id },
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
