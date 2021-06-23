import React from "react";
import { byId, entries, RRPlayer } from "../../shared/state";
import { useServerState } from "../state";

export function Players({
  onClickPlayer,
}: {
  onClickPlayer?: (player: RRPlayer) => void;
}) {
  const players = useServerState((state) => state.players);

  return (
    <ul>
      {entries(players).map((player) => (
        <Player key={player.id} player={player} onClickPlayer={onClickPlayer} />
      ))}
    </ul>
  );
}

const Player = React.memo(function Player({
  player,
  onClickPlayer,
}: {
  player: RRPlayer;
  onClickPlayer?: (player: RRPlayer) => void;
}) {
  const isOnline = useServerState(
    (state) =>
      byId(state.ephermal.players.entities, player.id)?.isOnline ?? false
  );

  return (
    <li
      onClick={() => onClickPlayer?.(player)}
      style={{
        cursor: onClickPlayer ? "pointer" : "auto",
        textDecorationColor: player.color,
        textDecorationLine: "underline",
      }}
    >
      {player.name} <em>{isOnline ? "online" : "offline"}</em>
    </li>
  );
});
