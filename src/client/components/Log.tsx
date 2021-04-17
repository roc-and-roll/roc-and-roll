import React from "react";
import { logEntryMessageAdd } from "../../shared/actions";
import { useServerDispatch, useServerState } from "../state";

export function Log() {
  const { ids: logEntryIds, entities: logEntries } = useServerState(
    (state) => state.logEntries
  );
  const { entities: players } = useServerState((state) => state.players);
  const dispatch = useServerDispatch();

  return (
    <>
      <ul>
        {logEntryIds.map((id) => {
          const logEntry = logEntries[id]!;
          const player = logEntry.playerId ? players[logEntry.playerId] : null;

          if (logEntry.type === "diceRoll") {
            const rolls = logEntry.payload.dice.map((die) => {
              return die.result;
            });
            return (
              <li
                key={id}
                title={new Date(logEntry.timestamp).toLocaleString()}
              >
                {player?.name ?? "system"}:{" "}
                {rolls.join(" + ") +
                  " = " +
                  rolls.reduce((acc, val) => acc + val).toString()}
              </li>
            );
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
