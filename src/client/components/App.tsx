import "modern-css-reset";
import "./global.scss";
import React, { Suspense, useRef } from "react";
import { Sidebar } from "./Sidebar";
import { useLoginLogout } from "../myself";
import { JoinGame as PlayerList } from "./JoinGame";
import { BottomFloats } from "./BottomFloats";
import { Notifications, NotificationTopAreaPortal } from "./Notifications";
import { ActiveMusicPlayer } from "../sound";
import QuickReferenceWrapper from "./quickReference/QuickReferenceWrapper";
import { ErrorBoundary } from "./ErrorBoundary";
import { useServerConnection } from "../state";
import { ConnectionLost } from "./ConnectionLost";
import { CampaignEntity } from "../../shared/campaign";
import { CampaignList } from "./CampaignList";
import { useCampaign, useChangeCampaign } from "../campaign";

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
  const notificationTopAreaPortal = useRef<HTMLDivElement>(null);
  const campaign = useCampaign();

  return (
    <NotificationTopAreaPortal.Provider value={notificationTopAreaPortal}>
      <ErrorBoundary>
        {campaign ? (
          <Campaign
            notificationTopAreaPortal={notificationTopAreaPortal}
            campaign={campaign}
          />
        ) : (
          <CampaignList />
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

const Campaign = React.memo<{
  notificationTopAreaPortal: React.RefObject<HTMLDivElement>;
  campaign: CampaignEntity;
}>(function Campaign({ notificationTopAreaPortal, campaign }) {
  const { login, logout, loggedIn } = useLoginLogout();
  const changeCampaign = useChangeCampaign();
  const { connected } = useServerConnection();

  return connected ? (
    loggedIn ? (
      <CampaignContent
        logout={logout}
        notificationTopAreaPortal={notificationTopAreaPortal}
      />
    ) : (
      <PlayerList
        login={login}
        switchCampaign={() => changeCampaign(null)}
        campaign={campaign}
      />
    )
  ) : (
    <ConnectionLost />
  );
});

function CampaignContent({
  logout,
  notificationTopAreaPortal,
}: {
  logout: () => void;
  notificationTopAreaPortal: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div className="app-wrapper">
      <ActiveMusicPlayer />
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
}
