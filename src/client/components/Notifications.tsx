import React, { useEffect, useRef, useState } from "react";
import {
  byId,
  entries,
  RRLogEntry,
  RRLogEntryDiceRoll,
  RRLogEntryID,
  RRLogEntryMessage,
} from "../../shared/state";
import { assertNever } from "../../shared/util";
import { diceResultString } from "../roll";
import { useServerState } from "../state";

const NOTIFICATION_TIMEOUT = 6000;

export function Notifications() {
  const notifications = useServerState((state) => state.logEntries);
  const [lastShownID, setLastShownID] = useState<RRLogEntryID>();
  const [newNotifications, setNewNotifications] = useState<RRLogEntry[]>([]);

  useEffect(() => {
    const list = entries(notifications);
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
      {newNotifications.map((notification) => (
        <Notification
          onExpired={() =>
            setNewNotifications((l) =>
              l.filter((n) => n.id !== notification.id)
            )
          }
          notification={notification}
          key={notification.id}
        />
      ))}
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

  useEffect(() => {
    expiredRef.current = onExpired;
  }, [onExpired]);

  useEffect(() => {
    setTimeout(() => {
      expiredRef.current();
    }, NOTIFICATION_TIMEOUT);
  }, []);

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
      <strong>{diceResultString(notification)}</strong>
    </>
  );

  const viewMessage = (notification: RRLogEntryMessage) => (
    <>
      <span className="player-name" style={{ color: player!.color }}>
        {player!.name}
      </span>
      {" wrote: "}
      <strong>{notification.payload.text}</strong>
    </>
  );

  const view = (notification: RRLogEntry) => {
    if (notification.type === "diceRoll") return viewDiceRoll(notification);
    if (notification.type === "message") return viewMessage(notification);
    assertNever(notification);
  };

  return <div className="notification">{view(notification)}</div>;
}
