import React from "react";
import { EntityCollection, RRMapID, RRPlayer } from "../../../shared/state";
import { ephemeralPlayerIdsAtom } from "./recoil";
import { useRecoilValue } from "recoil";
import { MapAreaOfEffect } from "./MapAreasOfEffect";

//Is there any benefit of having this in a different component from measure paths?
//Otherwise we could join the two, to a "mapoverlays" or something
export function AreasOfEffect({
  mapId,
  zoom,
  backgroundColor,
  players,
}: {
  mapId: RRMapID;
  zoom: number;
  backgroundColor: string;
  players: EntityCollection<RRPlayer>;
}) {
  const ephemeralPlayerIds = useRecoilValue(ephemeralPlayerIdsAtom);
  return (
    <>
      {ephemeralPlayerIds.map((ephemeralPlayerId) => {
        const player = players.entities[ephemeralPlayerId];
        if (!player || player.currentMap !== mapId) {
          return null;
        }
        return (
          <MapAreaOfEffect
            key={ephemeralPlayerId}
            ephemeralPlayerId={ephemeralPlayerId}
            zoom={zoom}
            color={player.color}
            mapBackgroundColor={backgroundColor}
          />
        );
      })}
    </>
  );
}
