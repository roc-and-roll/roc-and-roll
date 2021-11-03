import React, {
  Suspense,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  entries,
  RRLogEntry,
  RRLogEntryAchievement,
  RRLogEntryDiceRoll,
  RRLogEntryID,
  RRLogEntryMessage,
} from "../../shared/state";
import { assertNever } from "../../shared/util";
import { diceResultString, DiceResultWithTypes } from "../dice-rolling/roll";
import { useRRSimpleSound } from "../sound";
import { useServerState } from "../state";
import tada from "../../third-party/freesound.org/60443__jobro__tada1.mp3";
import { achievements } from "./achievementList";
import { Flipper, Flipped } from "react-flip-toolkit";
import { ErrorBoundary } from "./ErrorBoundary";

const DiceDisplay = React.lazy(
  () => import(/* webpackPrefetch: true */ "./diceRoller/DiceDisplay")
);

const NOTIFICATION_TIMEOUT = 6000;

export const NotificationAreaPortal = React.createContext<
  [HTMLDivElement | null, React.Dispatch<HTMLDivElement | null>]
>([null, () => {}]);

export function Notifications() {
  const notifications = entries(useServerState((state) => state.logEntries));
  const [lastShownID, setLastShownID] = useState<RRLogEntryID>();
  const [newNotifications, setNewNotifications] = useState<RRLogEntry[]>([]);
  const [hovered, setHovered] = useState(false);

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

  const [_portal, setPortal] = useContext(NotificationAreaPortal);

  return (
    <div
      className="mb-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Flipper flipKey={newNotifications.map((n) => n.id).join("")}>
        {newNotifications.map((notification) => (
          <Notification
            frozen={hovered}
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
      <div ref={(element) => setPortal(element)} />
    </div>
  );
}

const PLAYER_NAME_CLASS = "inline-block bg-white px-1 rounded-full";

function Notification({
  notification,
  onExpired,
  frozen,
}: {
  notification: RRLogEntry;
  onExpired: () => void;
  frozen: boolean;
}) {
  const expiredRef = useRef(onExpired);
  const [notificationReady, setNotificationReady] = useState(
    notification.type !== "diceRoll"
  );
  const [timerStartTime, setTimerStartTime] = useState(() => new Date());
  const [timeLeft, setTimeLeft] = useState(NOTIFICATION_TIMEOUT);

  useEffect(() => {
    expiredRef.current = onExpired;
  }, [onExpired]);

  useEffect(() => {
    if (!frozen) {
      setTimerStartTime(new Date());
    } else {
      setTimeLeft((timeLeft) => timeLeft - (+new Date() - +timerStartTime));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frozen]);

  useEffect(() => {
    if (notificationReady) {
      setTimerStartTime(new Date());
    }
  }, [notificationReady]);

  useEffect(() => {
    if (notificationReady && !frozen) {
      const id = setTimeout(() => {
        expiredRef.current();
      }, timeLeft);
      return () => clearTimeout(id);
    }
  }, [notificationReady, frozen, timeLeft]);

  const players = useServerState((state) => state.players);
  const player = notification.playerId
    ? players.entities[notification.playerId]
    : null;

  const viewDiceRoll = (notification: RRLogEntryDiceRoll) => (
    <>
      <span className={PLAYER_NAME_CLASS} style={{ color: player!.color }}>
        {player!.name}
      </span>
      {" rolled "}
      {notification.payload.rollName && (
        <>
          {"for "}
          <strong>{notification.payload.rollName}</strong>{" "}
        </>
      )}
      {notificationReady ? (
        <>
          {notification.payload.rollName && "= "}
          <strong>
            <DiceResultWithTypes logEntry={notification} />
          </strong>
        </>
      ) : (
        "..."
      )}
      <Suspense fallback={null}>
        <ErrorBoundary
          errorContent={<div>Error: Dice cannot be rendered :/</div>}
          onError={() => setNotificationReady(true)}
        >
          <DiceDisplay
            onAnimationFinished={() => setNotificationReady(true)}
            diceRoll={notification}
          />
        </ErrorBoundary>
      </Suspense>
      <small style={{ display: "block", paddingTop: 16 }}>
        {notificationReady
          ? diceResultString(notification.payload.diceRollTree)
          : " "}
      </small>
    </>
  );

  const viewMessage = (notification: RRLogEntryMessage) => (
    <>
      <span className={PLAYER_NAME_CLASS} style={{ color: player!.color }}>
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
      <div
        className="p-4 bg-rr-800 bg-opacity-90 mt-2 rounded cursor-pointer"
        style={style}
        onClick={onExpired}
      >
        {view(notification)}
      </div>
    </Flipped>
  );
}
