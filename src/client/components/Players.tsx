import { faPowerOff, faSignal } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
    <ul role="list" style={{ paddingLeft: 0 }}>
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
      byId(state.ephemeral.players.entities, player.id)?.isOnline ?? false
  );

  return (
    <li title={isOnline ? "online" : "offline"}>
      <FontAwesomeIcon icon={isOnline ? faSignal : faPowerOff} fixedWidth />{" "}
      <span
        onClick={() => onClickPlayer?.(player)}
        style={{
          cursor: onClickPlayer ? "pointer" : "auto",
          textDecorationColor: player.color,
          textDecorationLine: "underline",
          textDecorationThickness: 3,
        }}
      >
        {player.name}
      </span>
    </li>
  );
});
