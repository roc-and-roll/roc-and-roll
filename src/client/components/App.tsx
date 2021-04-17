import "modern-css-reset";
import "./global.scss";
import React from "react";
import { Sidebar } from "./Sidebar";
import { MapContainer } from "./MapContainer";
import styles from "./App.module.scss";
import { byId, useServerDispatch, useServerState } from "../state";
import useLocalState from "../useLocalState";
import { RRPlayerID } from "../../shared/state";
import { playerAdd } from "../../shared/actions";
import { MyselfContext } from "../myself";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Log } from "./Log";

export function App() {
  const players = useServerState((state) => state.players);
  const dispatch = useServerDispatch();
  const [
    myPlayerId,
    setMyPlayerId,
    forgetMyPlayerId,
  ] = useLocalState<RRPlayerID | null>("myPlayerId", null);

  const maps = useServerState((s) => s.maps);

  const myself = myPlayerId ? byId(players.entities, myPlayerId) : null;

  const joinAsNewPlayer = () => {
    const name = prompt("What is your name?");
    if (name === null) {
      return;
    }
    const action = dispatch(
      playerAdd({
        name,
        color: "#000000",
        currentMap: maps.ids[0]!,
        isGM: true,
        isOnline: false, // TODO
        tokenIds: [],
      })
    );
    setMyPlayerId(action.payload.id);
  };

  return myself ? (
    <MyselfContext.Provider value={myself}>
      <DndProvider backend={HTML5Backend}>
        <div className={styles["wrapper"]}>
          <Sidebar className={styles["sidebar"]!} logout={forgetMyPlayerId} />
          <MapContainer className={styles["map"]!} />
          <Log />
        </div>
      </DndProvider>
    </MyselfContext.Provider>
  ) : (
    <>
      <h1>Join Game</h1>
      <ul>
        {players.ids.map((id) => {
          const player = byId(players.entities, id)!;

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
