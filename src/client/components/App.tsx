import "modern-css-reset";
import "./global.scss";
import React from "react";
import { Sidebar } from "./Sidebar";
import { MapContainer } from "./MapContainer";
import styles from "./App.module.scss";
import { byId, useServerState } from "../state";
import useLocalState from "../useLocalState";
import { RRPlayerID } from "../../shared/state";
import { MyselfContext } from "../myself";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { JoinGame } from "./JoinGame";
import { BottomFloats } from "./BottomFloats";

export function App() {
  const players = useServerState((state) => state.players);
  const [
    myPlayerId,
    setMyPlayerId,
    forgetMyPlayerId,
  ] = useLocalState<RRPlayerID | null>("myPlayerId", null);

  // Important: Use useMyself everywhere else!
  const myself = myPlayerId ? byId(players.entities, myPlayerId) : null;

  return myself ? (
    <MyselfContext.Provider value={myself}>
      <DndProvider backend={HTML5Backend}>
        <div className={styles["wrapper"]}>
          <Sidebar className={styles["sidebar"]!} logout={forgetMyPlayerId} />
          <MapContainer className={styles["map"]!} />
          <BottomFloats />
        </div>
      </DndProvider>
    </MyselfContext.Provider>
  ) : (
    <JoinGame setMyPlayerId={setMyPlayerId} />
  );
}
