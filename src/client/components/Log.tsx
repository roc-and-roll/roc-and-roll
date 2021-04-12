import React from "react";
import { useServerState } from "../state";

export function Log() {
  const { ids, entities } = useServerState((state) => state.logEntries);

  return (
    <ul>
      {ids.map((id) => {
        const logEntry = entities[id]!;
        if (logEntry.type !== "message") {
          return null;
        }

        return (
          <li key={id}>
            {logEntry.playerId} ({new Date(logEntry.timestamp).toLocaleString()}
            ): {logEntry.payload.text}
          </li>
        );
      })}
    </ul>
  );
}
