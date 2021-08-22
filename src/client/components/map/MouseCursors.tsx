import React from "react";
import { Matrix } from "transformation-matrix";
import {
  byId,
  EntityCollection,
  RRMapID,
  RRPlayer,
  RRPlayerID,
  RRPoint,
} from "../../../shared/state";
import { ephemeralPlayerIdsAtom } from "./recoil";
import { MouseCursor } from "./MouseCursor";
import { useRecoilValue } from "recoil";

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
  const ephemeralPlayerIds = useRecoilValue(ephemeralPlayerIdsAtom);
  return (
    <>
      {ephemeralPlayerIds.map((ephemeralPlayerId) => {
        if (ephemeralPlayerId === myId) {
          return null;
        }

        const player = byId(players.entities, ephemeralPlayerId);
        if (!player || player.currentMap !== mapId) {
          return null;
        }

        return (
          <MouseCursor
            key={ephemeralPlayerId}
            playerId={player.id}
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
