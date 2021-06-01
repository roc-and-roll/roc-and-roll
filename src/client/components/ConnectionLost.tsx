import React, { useRef, useEffect, useState } from "react";
import { useServerConnection } from "../state";

export function ConnectionLost() {
  const { subscribeToReconnectAttempts, unsubscribeFromReconnectAttempts } =
    useServerConnection();

  const lastReconnectRef = useRef<number | null>(null);
  useEffect(() => {
    const subscriber = () => (lastReconnectRef.current = Date.now());

    subscribeToReconnectAttempts(subscriber);

    return () => unsubscribeFromReconnectAttempts(subscriber);
  }, [subscribeToReconnectAttempts, unsubscribeFromReconnectAttempts]);

  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(id);
  }, []);

  const diffInSeconds =
    lastReconnectRef.current !== null
      ? Math.max(0, Math.round((now - lastReconnectRef.current) / 1000))
      : null;

  return (
    <div className="connection-lost">
      <div>
        <h1>Uh oh. Looks like a TPK&hellip;</h1>
        <p>
          &hellip;of the server or your internet connection (connection to the
          server lost).
        </p>
        <p>We will attempt to automatically reconnect you.</p>
        {diffInSeconds !== null && (
          <p>
            <small>
              Last reconnection attempt: {diffInSeconds} seconds ago.
            </small>
          </p>
        )}
      </div>
    </div>
  );
}
