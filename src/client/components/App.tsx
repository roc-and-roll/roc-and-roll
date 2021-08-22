import "modern-css-reset";
import "./global.scss";
import React, { Suspense, useRef } from "react";
import { Sidebar } from "./Sidebar";
import { useLoginLogout } from "../myself";
import { JoinGame } from "./JoinGame";
import { BottomFloats } from "./BottomFloats";
import { Notifications, NotificationTopAreaPortal } from "./Notifications";
import { SongPlayer } from "../sound";
import QuickReferenceWrapper from "./quickReference/QuickReferenceWrapper";
import { ErrorBoundary } from "./ErrorBoundary";
import { useServerConnection } from "../state";
import { ConnectionLost } from "./ConnectionLost";

// Load the map lazily to enable code splitting -> the sidebar will load faster.
const MapContainer = React.lazy(
  // TODO: We would really want to use webpackPreload here, but that's not
  // currently supported by the html-webpack-plugin:
  // https://github.com/jantimon/html-webpack-plugin/issues/1317
  () => import(/* webpackPrefetch: true */ "./map/MapContainer")
);

let LagRadar: React.ComponentType;
if (process.env.NODE_ENV === "development") {
  // Load the LagRadar component lazily and only in development.
  // We don't want it to load in production.
  LagRadar = React.lazy(() => import("./LagRadar"));
}

export function App() {
  const { login, logout, loggedIn } = useLoginLogout();
  const notificationTopAreaPortal = useRef<HTMLDivElement>(null);
  const { connected } = useServerConnection();

  return (
    <NotificationTopAreaPortal.Provider value={notificationTopAreaPortal}>
      <ErrorBoundary>
        {connected ? (
          loggedIn ? (
            <Game
              logout={logout}
              notificationTopAreaPortal={notificationTopAreaPortal}
            />
          ) : (
            <JoinGame login={login} />
          )
        ) : (
          <ConnectionLost />
        )}
      </ErrorBoundary>
      {process.env.NODE_ENV === "development" && (
        <Suspense fallback={null}>
          <LagRadar />
        </Suspense>
      )}
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
          <QuickReferenceWrapper />
        </main>
      </Suspense>
      <Notifications topAreaPortal={notificationTopAreaPortal} />
    </div>
  );
});
