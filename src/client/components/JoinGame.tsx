import React from "react";
import { playerAdd } from "../../shared/actions";
import { RRPlayerID } from "../../shared/state";
import { randomColor } from "../colors";
import { byId, useServerDispatch, useServerState } from "../state";
import "./JoinGame.scss";

export function JoinGame({
  setMyPlayerId,
}: {
  setMyPlayerId: (id: RRPlayerID) => void;
}) {
  const dispatch = useServerDispatch();
  const players = useServerState((state) => state.players);
  const maps = useServerState((s) => s.maps);

  const joinAsNewPlayer = () => {
    const name = prompt("What is your name?")?.trim();
    if (name === undefined || name.length === 0) {
      return;
    }
    const action = dispatch(
      playerAdd({
        name,
        color: randomColor(),
        currentMap: maps.ids[0]!,
        isGM: false,
        isOnline: false, // TODO
        tokenIds: [],
      })
    );
    setMyPlayerId(action.payload.id);
  };

  return (
    <div className="join-game-wrapper">
      <h1>Join Game</h1>
      <ul role="list">
        {players.ids.map((id) => {
          const player = byId(players.entities, id)!;

          return (
            <li
              key={id}
              onClick={() => setMyPlayerId(id)}
              style={{
                textDecoration: "underline",
                textDecorationColor: player.color,
              }}
            >
              {player.name}
            </li>
          );
        })}
        <li onClick={joinAsNewPlayer}>
          <em>join as new player</em>
        </li>
      </ul>
    </div>
  );
}
