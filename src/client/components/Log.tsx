import React from "react";
import { logEntryMessageAdd } from "../../shared/actions";
import { useServerDispatch, useServerState } from "../state";

export function Log() {
  const { ids, entities } = useServerState((state) => state.logEntries);
  const dispatch = useServerDispatch();

  return (
    <>
      <ul>
        {ids.map((id) => {
          const logEntry = entities[id]!;
          if (logEntry.type !== "message") {
            return null;
          }

          return (
            <li key={id}>
              {logEntry.playerId} (
              {new Date(logEntry.timestamp).toLocaleString()}
              ): {logEntry.payload.text}
            </li>
          );
        })}
      </ul>
      <button
        onClick={() => {
          const text = prompt("text");
          if (text === null) {
            return;
          }
          dispatch(
            logEntryMessageAdd({
              playerId: "bar",
              silent: false,
              timestamp: Date.now(),
              payload: {
                text,
              },
            })
          );
        }}
      >
        add message
      </button>
    </>
  );
}
