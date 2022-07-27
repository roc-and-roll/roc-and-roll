import React, {
  Suspense,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
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
//cspell: disable-next-line
import tada from "../../third-party/freesound.org/60443__jobro__tada1.mp3";
//cspell: disable-next-line
import newMessageSound from "../../third-party/freesound.org/545373__stwime__up3.mp3";
import { achievements } from "./achievementList";
import { Flipper, Flipped } from "react-flip-toolkit";
import { ErrorBoundary } from "./ErrorBoundary";
import { useRRSettings } from "../settings";
import { useMyProps } from "../myself";
import { getLogRollName } from "../util";

const DiceDisplay = React.lazy(
  () => import(/* webpackPrefetch: true */ "./diceRoller/DiceDisplay")
);

const NOTIFICATION_TIMEOUT = 6000;

export const NotificationAreaPortal = React.createContext<
  [HTMLDivElement | null, React.Dispatch<HTMLDivElement | null>]
>([null, () => {}]);

export function Notifications() {
  const logEntries = useServerState((state) => state.logEntries);
  const lastShownIDRef = useRef<RRLogEntryID | undefined>(
    logEntries.ids[logEntries.ids.length - 1]
  );
  const [notifications, setNotifications] = useState<RRLogEntry[]>([]);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const newNotifications: RRLogEntry[] = [];
    for (let i = logEntries.ids.length - 1; i >= 0; i--) {
      const id = logEntries.ids[i]!;
      if (id === lastShownIDRef.current) {
        break;
      }
      const logEntry = logEntries.entities[id]!;
      if (!logEntry.silent) {
        newNotifications.push(logEntry);
      }
    }

    if (newNotifications.length > 0) {
      lastShownIDRef.current =
        newNotifications[newNotifications.length - 1]!.id;
      setNotifications((oldNotifications) => [
        ...oldNotifications,
        ...newNotifications,
      ]);
    }
  }, [logEntries]);

  const [_portal, setPortal] = useContext(NotificationAreaPortal);

  return (
    <div
      className="mb-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Flipper flipKey={notifications.map((n) => n.id).join(",")}>
        {notifications.map((notification) => (
          <Notification
            key={notification.id}
            notification={notification}
            frozen={hovered}
            onExpired={() =>
              setNotifications((notifications) =>
                notifications.filter((n) => n.id !== notification.id)
              )
            }
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
  const [settings] = useRRSettings();
  const [{ logNames }] = useRRSettings();
  const characters = useServerState((s) => s.characters);
  const myself = useMyProps("id");

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
        {getLogRollName(
          player!.name,
          characters,
          logNames,
          notification.payload.characterIds
        )}
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

  const [playAchievement] = useRRSimpleSound(tada);
  const [playNewMessage] = useRRSimpleSound(newMessageSound);
  useEffect(() => {
    if (notification.type === "achievement") playAchievement();
    else if (
      notification.type === "message" &&
      settings.notificationSound !== "none" &&
      notification.playerId !== myself.id
    )
      playNewMessage();
    else if (
      notification.type === "diceRoll" &&
      settings.notificationSound === "all" &&
      notification.playerId !== myself.id
    )
      playNewMessage();
  }, [
    myself.id,
    notification.playerId,
    notification.type,
    playAchievement,
    playNewMessage,
    settings.notificationSound,
  ]);

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
        className="p-4 mt-2 cursor-pointer hud-panel"
        style={style}
        onClick={onExpired}
      >
        {view(notification)}
      </div>
    </Flipped>
  );
}
