import clsx from "clsx";
import React from "react";
import { useDrag, useDrop } from "react-dnd";
import { mapAdd, mapSettingsUpdate, playerUpdate } from "../../shared/actions";
import { randomColor } from "../../shared/colors";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../shared/constants";
import {
  EntityCollection,
  entries,
  RRMapID,
  RRPlayer,
  RRPlayerID,
} from "../../shared/state";
import { EMPTY_ENTITY_COLLECTION } from "../../shared/state";
import { useMyProps } from "../myself";
import { usePrompt } from "../dialog-boxes";
import { useServerDispatch, useServerState } from "../state";
import { GMArea } from "./GMArea";
import { Button } from "./ui/Button";
import { SmartTextInput } from "./ui/TextInput";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMapMarkerAlt,
  faMapSigns,
  faUser,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { RRMessage, useServerMessages } from "../serverMessages";
import { rrid } from "../../shared/util";
import { mapTransformAtom } from "./map/Map";
import { useRecoilCallback } from "recoil";

export const Maps = React.memo(function Maps() {
  const dispatch = useServerDispatch();
  const mapIds = useServerState((state) => state.maps.ids);
  const players = useServerState((state) => state.players);
  const prompt = usePrompt();

  return (
    <GMArea>
      <ul role="list" className="maps">
        {mapIds.map((mapId) => (
          <MapListEntry
            key={mapId}
            mapId={mapId}
            players={players}
            showDragHandle
          />
        ))}
        <li className="maps-create">
          <Button
            onClick={async () => {
              const name = (await prompt("Enter the name of the map"))?.trim();
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
});

export function MapListEntry({
  mapId,
  players: allPlayers,
  showDragHandle,
}: {
  mapId: RRMapID;
  players: EntityCollection<RRPlayer>;
  showDragHandle?: boolean;
}) {
  const dispatch = useServerDispatch();
  const players = entries(allPlayers).filter(
    (player) => player.currentMap === mapId
  );
  const mapSettings = useServerState(
    (state) => state.maps.entities[mapId]?.settings
  );
  const myself = useMyProps("currentMap", "id");
  const isMyCurrentMap = myself.currentMap === mapId;

  const [, dragRef] = useDrag<{ id: RRMapID }, void, null>(
    () => ({
      type: "map",
      item: { id: mapId },
    }),
    [mapId]
  );

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

  const { send } = useServerMessages();

  const sendSnapView = useRecoilCallback(({ snapshot }) => () => {
    send({
      type: "snap_view",
      transform: snapshot.getLoadable(mapTransformAtom).getValue(),
      mapId,
      id: rrid<RRMessage>(),
    });
  });

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
          >
            <FontAwesomeIcon icon={faMapSigns} />
          </div>
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
            title="move everyone here"
          >
            <FontAwesomeIcon icon={faUsers} />
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
            title="move myself here"
          >
            <FontAwesomeIcon icon={faUser} />
          </Button>
        )}
        {isMyCurrentMap && (
          <Button
            onClick={() => sendSnapView()}
            title="snap all players' view to my view"
          >
            <FontAwesomeIcon icon={faMapMarkerAlt} />
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
