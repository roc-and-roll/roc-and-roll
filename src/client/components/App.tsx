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
import { Notifications } from "./Notifications";
import { SongPlayer } from "../sound";

// Load the map lazily to enable code splitting -> the sidebar will load faster.
const MapContainer = React.lazy(() => import("./map/MapContainer"));

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
        <div className="app-wrapper">
          <SongPlayer />
          <Sidebar logout={forgetMyPlayerId} />
          <Suspense fallback="Map is loading...">
            <main className="app-map">
              <MapContainer />
              <BottomFloats />
            </main>
          </Suspense>
          <Notifications />
        </div>
      ) : (
        <JoinGame setMyPlayerId={setMyPlayerId} />
      )}
    </MyselfContext.Provider>
  );
}
