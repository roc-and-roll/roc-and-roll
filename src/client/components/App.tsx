import "modern-css-reset";
import "./global.scss";
import React, { Suspense, useState } from "react";
import { Sidebar } from "./Sidebar";
import { useAutoDispatchPlayerIdOnChange, useServerState } from "../state";
import useLocalState from "../useLocalState";
import { byId, RRPlayerID, RRMapObjectID } from "../../shared/state";
import { MyselfContext } from "../myself";
import { JoinGame } from "./JoinGame";
import { BottomFloats } from "./BottomFloats";
import { MapSelectionContext } from "../mapSelection";

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
  const mapState = useState<RRMapObjectID[]>([]);

  useAutoDispatchPlayerIdOnChange(myself?.id ?? null);

  return (
    <MapSelectionContext.Provider value={mapState}>
      <MyselfContext.Provider value={myself}>
        {myself ? (
          <div className="app-wrapper">
            <Sidebar logout={forgetMyPlayerId} />
            <Suspense fallback="Map is loading...">
              <MapContainer className="app-map" />
            </Suspense>
            <BottomFloats />
          </div>
        ) : (
          <JoinGame setMyPlayerId={setMyPlayerId} />
        )}
      </MyselfContext.Provider>
    </MapSelectionContext.Provider>
  );
}
