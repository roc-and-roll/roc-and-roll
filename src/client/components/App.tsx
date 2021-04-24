import "modern-css-reset";
import "./global.scss";
import React, { Suspense } from "react";
import { Sidebar } from "./Sidebar";
import { useAutoDispatchPlayerIdOnChange, useServerState } from "../state";
import useLocalState from "../useLocalState";
import { byId, RRPlayerID } from "../../shared/state";
import { MyselfContext } from "../myself";
import { JoinGame } from "./JoinGame";
import { BottomFloats } from "./BottomFloats";

// Load the map lazily to enable code splitting -> the sidebar will load faster.
const MapContainer = React.lazy(() => import("./MapContainer"));

export function App() {
  const players = useServerState((state) => state.players);
  const [
    myPlayerId,
    setMyPlayerId,
    forgetMyPlayerId,
  ] = useLocalState<RRPlayerID | null>("myPlayerId", null);

  // Important: Use useMyself everywhere else!
  const myself = myPlayerId ? byId(players.entities, myPlayerId) ?? null : null;

  useAutoDispatchPlayerIdOnChange(myself?.id ?? null);

  return (
    <MyselfContext.Provider value={myself}>
      {myself ? (
        <MyselfContext.Provider value={myself}>
          <div className="app-wrapper">
            <Sidebar logout={forgetMyPlayerId} />
            <Suspense fallback="Map is loading...">
              <MapContainer className="app-map" />
            </Suspense>
            <BottomFloats />
          </div>
        </MyselfContext.Provider>
      ) : (
        <JoinGame setMyPlayerId={setMyPlayerId} />
      )}
    </MyselfContext.Provider>
  );
}
