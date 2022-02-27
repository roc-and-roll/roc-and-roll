import "./deprecated-global.scss";
import "../global.css";
import React, { Suspense, useState } from "react";
import { useLoginLogout } from "../myself";
import { JoinGame } from "./JoinGame";
import { NotificationAreaPortal } from "./Notifications";
import { ActiveMusicPlayer } from "../sound";
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
  const notificationAreaPortal = useState<HTMLDivElement | null>(null);
  const { connected } = useServerConnection();

  return (
    <NotificationAreaPortal.Provider value={notificationAreaPortal}>
      <ErrorBoundary>
        {connected ? (
          loggedIn ? (
            <Game logout={logout} />
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
    </NotificationAreaPortal.Provider>
  );
}

const Game = React.memo<{
  logout: () => void;
}>(function Game({ logout }) {
  return (
    <div className="app-wrapper">
      <ActiveMusicPlayer />
      <Suspense fallback="Map is loading...">
        <main className="app-map">
          <ErrorBoundary>
            <MapContainer />
          </ErrorBoundary>
          <QuickReferenceWrapper />
        </main>
      </Suspense>
    </div>
  );
});
