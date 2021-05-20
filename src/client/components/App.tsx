import "modern-css-reset";
import "./global.scss";
import React, { Suspense, useRef } from "react";
import { Sidebar } from "./Sidebar";
import { useLoginLogout } from "../myself";
import { JoinGame } from "./JoinGame";
import { BottomFloats } from "./BottomFloats";
import { Notifications, NotificationTopAreaPortal } from "./Notifications";
import { SongPlayer } from "../sound";
import { ErrorBoundary } from "./ErrorBoundary";

// Load the map lazily to enable code splitting -> the sidebar will load faster.
const MapContainer = React.lazy(() => import("./map/MapContainer"));

export function App() {
  const { login, logout, loggedIn } = useLoginLogout();
  const notificationTopAreaPortal = useRef<HTMLDivElement>(null);

  return (
    <NotificationTopAreaPortal.Provider value={notificationTopAreaPortal}>
      <ErrorBoundary>
        {loggedIn ? (
          <Game
            logout={logout}
            notificationTopAreaPortal={notificationTopAreaPortal}
          />
        ) : (
          <JoinGame login={login} />
        )}
      </ErrorBoundary>
    </NotificationTopAreaPortal.Provider>
  );
}

const Game = React.memo<{
  logout: () => void;
  notificationTopAreaPortal: React.RefObject<HTMLDivElement>;
}>(function Game({ logout, notificationTopAreaPortal }) {
  return (
    <div className="app-wrapper">
      <SongPlayer />
      <ErrorBoundary>
        <Sidebar logout={logout} />
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
  );
});
