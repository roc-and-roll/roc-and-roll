import React from "react";
import { byId, entries } from "../../shared/state";
import { useServerState } from "../state";

export function Players() {
  const players = useServerState((state) => state.players);
  const ephermalPlayers = useServerState((state) => state.ephermal.players);

  return (
    <ul>
      {entries(players).map((player) => {
        const ephermalPlayer = byId(ephermalPlayers.entities, player.id);

        return (
          <li
            key={player.id}
            style={{
              textDecorationColor: player.color,
              textDecorationLine: "underline",
            }}
          >
            {player.name}{" "}
            {ephermalPlayer && (
              <em>{ephermalPlayer.isOnline ? "online" : "offline"}</em>
            )}
          </li>
        );
      })}
    </ul>
  );
}
