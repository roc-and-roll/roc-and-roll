import React from "react";
import {
  EntityCollection,
  entries,
  RRMapID,
  RRPlayer,
} from "../../../shared/state";
import { MapMeasurePath } from "./MapMeasurePath";
import { useServerState } from "../../state";

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
  const ephemeralPlayers = useServerState((state) => state.ephemeral.players);
  return (
    <>
      {entries(ephemeralPlayers).map((ephemeralPlayer) => {
        const player = players.entities[ephemeralPlayer.id];
        if (!player || player.currentMap !== mapId) {
          return null;
        }
        return (
          <MapMeasurePath
            key={ephemeralPlayer.id}
            measurePath={ephemeralPlayer.measurePath}
            zoom={zoom}
            color={player.color}
            mapBackgroundColor={backgroundColor}
          />
        );
      })}
    </>
  );
}
