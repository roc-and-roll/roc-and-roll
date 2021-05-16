import "modern-css-reset";
import "./global.scss";
import React, { Suspense, useRef } from "react";
import { Sidebar } from "./Sidebar";
import { useAutoDispatchPlayerIdOnChange, useServerState } from "../state";
import useLocalState from "../useLocalState";
import { byId, RRPlayerID } from "../../shared/state";
import { MyselfContext } from "../myself";
import { JoinGame } from "./JoinGame";
import { BottomFloats } from "./BottomFloats";
import { Notifications, NotificationTopAreaPortal } from "./Notifications";
import { SongPlayer } from "../sound";
import { ErrorBoundary } from "./ErrorBoundary";

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
  const notificationTopAreaPortal = useRef<HTMLDivElement>(null);

  useAutoDispatchPlayerIdOnChange(myself?.id ?? null);

  return (
    <MyselfContext.Provider value={myself}>
      <NotificationTopAreaPortal.Provider value={notificationTopAreaPortal}>
        {myself ? (
          <div className="app-wrapper">
            <SongPlayer />
            <ErrorBoundary>
              <Sidebar logout={forgetMyPlayerId} />
            </ErrorBoundary>
            <Suspense fallback="Map is loading...">
              <main className="app-map">
                <ErrorBoundary>
                  <MapContainer />
                </ErrorBoundary>
                <ErrorBoundary>
                  <BottomFloats />
                </ErrorBoundary>
              </main>
            </Suspense>
            <Notifications topAreaPortal={notificationTopAreaPortal} />
          </div>
        ) : (
          <ErrorBoundary>
            <JoinGame setMyPlayerId={setMyPlayerId} />
          </ErrorBoundary>
        )}
      </NotificationTopAreaPortal.Provider>
    </MyselfContext.Provider>
  );
}
