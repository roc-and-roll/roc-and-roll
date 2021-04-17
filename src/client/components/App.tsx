import "modern-css-reset";
import "./global.scss";
import React from "react";
import { Sidebar } from "./Sidebar";
import { Map } from "./Map";
import styles from "./App.module.scss";
import { useServerDispatch, useServerState } from "../state";
import useLocalState from "../useLocalState";
import { RRID } from "../../shared/state";
import { playerAdd } from "../../shared/actions";
import { MyselfContext } from "../myself";

export function App() {
  const players = useServerState((state) => state.players);
  const dispatch = useServerDispatch();
  const [
    myPlayerId,
    setMyPlayerId,
    forgetMyPlayerId,
  ] = useLocalState<RRID | null>("myPlayerId", null);

  const myself = myPlayerId ? players.entities[myPlayerId] : null;

  const joinAsNewPlayer = () => {
    const name = prompt("What is your name?");
    if (name === null) {
      return;
    }
    const action = dispatch(
      playerAdd({
        name,
        color: { r: 0, g: 0, b: 0 },
        currentMap: "foo", // TODO
        isGM: true,
        isOnline: false, // TODO
        tokenIds: [],
      })
    );
    setMyPlayerId(action.payload.id);
  };

  return myself ? (
    <MyselfContext.Provider value={myself}>
      <div className={styles["wrapper"]}>
        <Sidebar className={styles["sidebar"]!} logout={forgetMyPlayerId} />
        <Map
          className={styles["map"]!}
          tokens={[
            { id: "abc", x: 30, y: 50, color: "red" },
            { id: "def", x: 80, y: 20, color: "green" },
          ]}
        />
      </div>
    </MyselfContext.Provider>
  ) : (
    <>
      <h1>Join Game</h1>
      <ul>
        {players.ids.map((id) => {
          const player = players.entities[id]!;

          return (
            <li
              key={id}
              onClick={() => setMyPlayerId(id)}
              className={styles["playerName"]}
            >
              {player.name}
            </li>
          );
        })}
        <button onClick={joinAsNewPlayer}>join as new player</button>
      </ul>
    </>
  );
}
