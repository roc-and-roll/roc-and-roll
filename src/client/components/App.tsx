import "modern-css-reset";
import "./global.scss";
import React from "react";
import { Sidebar } from "./Sidebar";
import { MapContainer } from "./MapContainer";
import { useServerState } from "../state";
import useLocalState from "../useLocalState";
import { byId, RRPlayerID } from "../../shared/state";
import { MyselfContext } from "../myself";
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
      <div className="app-wrapper">
        <Sidebar logout={forgetMyPlayerId} />
        <MapContainer className="app-map" />
        <BottomFloats />
      </div>
    </MyselfContext.Provider>
  ) : (
    <JoinGame setMyPlayerId={setMyPlayerId} />
  );
}
