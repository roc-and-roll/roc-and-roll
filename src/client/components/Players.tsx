import React from "react";
import { byId, entries, RRPlayer } from "../../shared/state";
import { useServerState } from "../state";

export function Players({
  onClickPlayer,
}: {
  onClickPlayer?: (player: RRPlayer) => void;
}) {
  const players = useServerState((state) => state.players);
  const ephermalPlayers = useServerState((state) => state.ephermal.players);

  return (
    <ul>
      {entries(players).map((player) => {
        const ephermalPlayer = byId(ephermalPlayers.entities, player.id);

        return (
          <li
            key={player.id}
            onClick={() => onClickPlayer && onClickPlayer(player)}
            style={{
              cursor: onClickPlayer ? "pointer" : "auto",
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
