import React, { Suspense, useEffect, useRef, useState } from "react";
import {
  byId,
  entries,
  RRLogEntry,
  RRLogEntryAchievement,
  RRLogEntryDiceRoll,
  RRLogEntryID,
  RRLogEntryMessage,
} from "../../shared/state";
import { assertNever } from "../../shared/util";
import { DiceResultWithTypes } from "../roll";
import { useRRSimpleSound } from "../sound";
import { useServerState } from "../state";
import tada from "../../third-party/freesound.org/60443__jobro__tada1.mp3";
import { achievements } from "./achievementList";
import { Flipper, Flipped } from "react-flip-toolkit";

const DiceDisplay = React.lazy(
  () => import(/* webpackPrefetch: true */ "./diceRoller/DiceDisplay")
);

const NOTIFICATION_TIMEOUT = 6000;

export const NotificationTopAreaPortal =
  React.createContext<React.RefObject<HTMLDivElement> | null>(null);

export function Notifications({
  topAreaPortal,
}: {
  topAreaPortal: React.RefObject<HTMLDivElement>;
}) {
  const serverNotifications = useServerState((state) => state.logEntries);
  const notifications = entries(serverNotifications);
  const [lastShownID, setLastShownID] = useState<RRLogEntryID>();
  const [newNotifications, setNewNotifications] = useState<RRLogEntry[]>([]);

  useEffect(() => {
    const list = notifications;
    if (lastShownID === undefined && list.length > 1) {
      setLastShownID(list[list.length - 1]?.id);
      return;
    }

    const lastIndex =
      lastShownID !== undefined
        ? list.findIndex((e) => e.id === lastShownID)
        : 0;

    const newNotifications = list.slice(lastIndex + 1).filter((n) => !n.silent);
    if (newNotifications.length > 0) {
      setNewNotifications((l) => [...l, ...newNotifications]);
      setLastShownID(newNotifications[newNotifications.length - 1]!.id);
    }
  }, [lastShownID, notifications]);

  return (
    <div className="notifications">
      <div className="notitifactions-top-area" ref={topAreaPortal}></div>
      <Flipper flipKey={newNotifications.map((n) => n.id).join("")}>
        {newNotifications.map((notification) => (
          <Notification
            key={notification.id}
            onExpired={() =>
              setNewNotifications((l) =>
                l.filter((n) => n.id !== notification.id)
              )
            }
            notification={notification}
          />
        ))}
      </Flipper>
    </div>
  );
}

function Notification({
  notification,
  onExpired,
}: {
  notification: RRLogEntry;
  onExpired: () => void;
}) {
  const expiredRef = useRef(onExpired);
  const [notificationReady, setNotificationReady] = useState(
    notification.type !== "diceRoll"
  );

  useEffect(() => {
    expiredRef.current = onExpired;
  }, [onExpired]);

  useEffect(() => {
    if (notificationReady) {
      const id = setTimeout(() => {
        expiredRef.current();
      }, NOTIFICATION_TIMEOUT);
      return () => clearTimeout(id);
    }
  }, [notificationReady]);

  const players = useServerState((state) => state.players);
  const player = notification.playerId
    ? byId(players.entities, notification.playerId)
    : null;

  const viewDiceRoll = (notification: RRLogEntryDiceRoll) => (
    <>
      <span className="player-name" style={{ color: player!.color }}>
        {player!.name}
      </span>
      {" rolled a "}
      {notificationReady ? (
        <strong>
          <DiceResultWithTypes logEntry={notification} />
        </strong>
      ) : (
        "..."
      )}
      <Suspense fallback={null}>
        <DiceDisplay
          onAnimationFinished={() => setNotificationReady(true)}
          diceRoll={notification}
        />
      </Suspense>
    </>
  );

  const viewMessage = (notification: RRLogEntryMessage) => (
    <>
      <span className="player-name" style={{ color: player!.color }}>
        {player!.name}
      </span>
      {" wrote: "}
      <strong>
        {notification.payload.text.length > 200
          ? notification.payload.text.substr(0, 200) + "..."
          : notification.payload.text}
      </strong>
    </>
  );

  const [play] = useRRSimpleSound(tada);
  useEffect(() => {
    if (notification.type === "achievement") play();
  }, [notification.type, play]);

  const viewAchievement = (notification: RRLogEntryAchievement) => {
    const achievement = achievements.find(
      (a) => a.id === notification.payload.achievementId
    );
    return (
      <>
        <span className="player-name" style={{ color: player!.color }}>
          {player!.name}
        </span>
        {" unlocked: "}
        <strong>{achievement?.name}</strong>
        <br />
        <small>{achievement?.requirement ?? ""}</small>
      </>
    );
  };

  const view = (notification: RRLogEntry) => {
    switch (notification.type) {
      case "diceRoll":
        return viewDiceRoll(notification);
      case "message":
        return viewMessage(notification);
      case "achievement":
        return viewAchievement(notification);
      default:
        assertNever(notification);
    }
  };

  const transition = "opacity 150ms ease-out";
  const [style, setStyle] = useState({ opacity: 0, transition });
  useEffect(() => {
    setStyle({ opacity: 1, transition });
  }, []);

  return (
    <Flipped flipId={notification.id}>
      <div className="notification" style={style}>
        {view(notification)}
      </div>
    </Flipped>
  );
}
