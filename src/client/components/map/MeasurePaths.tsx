import React from "react";
import { EntityCollection, RRMapID, RRPlayer } from "../../../shared/state";
import { ephemeralPlayerIdsAtom } from "./recoil";
import { MapMeasurePath } from "./MapMeasurePath";
import { useRecoilValue } from "recoil";

export function MeasurePaths({
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
          <MapMeasurePath
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
