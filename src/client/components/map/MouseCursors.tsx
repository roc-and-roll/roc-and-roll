import React from "react";
import { Matrix } from "transformation-matrix";
import {
  EntityCollection,
  entries,
  RRMapID,
  RRPlayer,
  RRPlayerID,
  RRPoint,
} from "../../../shared/state";
import { MouseCursor } from "./MouseCursor";
import { useServerState } from "../../state";

export function MouseCursors({
  myId,
  mapId,
  transform,
  viewPortSize,
  contrastColor,
  players,
}: {
  myId: RRPlayerID;
  mapId: RRMapID;
  transform: Matrix;
  viewPortSize: RRPoint;
  contrastColor: string;
  players: EntityCollection<RRPlayer>;
}) {
  const ephemeralPlayers = useServerState((state) => state.ephemeral.players);
  return (
    <>
      {entries(ephemeralPlayers).map((ephemeralPlayer) => {
        if (ephemeralPlayer.id === myId) {
          return null;
        }

        const player = players.entities[ephemeralPlayer.id];
        if (!player || player.currentMap !== mapId) {
          return null;
        }

        return (
          <MouseCursor
            key={ephemeralPlayer.id}
            mapMouse={ephemeralPlayer.mapMouse}
            playerColor={player.color}
            playerName={player.name}
            transform={transform}
            viewPortSize={viewPortSize}
            contrastColor={contrastColor}
          />
        );
      })}
    </>
  );
}
