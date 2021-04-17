import React, { useLayoutEffect, useRef, useState } from "react";
import { logEntryMessageAdd } from "../../shared/actions";
import { RRLogEntry } from "../../shared/state";
import { useMyself } from "../myself";
import { byId, useServerDispatch, useServerState } from "../state";

function LogEntry(props: { logEntry: RRLogEntry }) {
  const { entities: players } = useServerState((state) => state.players);
  const { logEntry } = props;
  const player = logEntry.playerId ? byId(players, logEntry.playerId) : null;

  if (logEntry.type === "diceRoll") {
    const rolls = logEntry.payload.dice.map((die) => {
      return die.result;
    });
    return (
      <div title={new Date(logEntry.timestamp).toLocaleString()}>
        {player?.name ?? "system"}:{" "}
        {rolls.join(" + ") +
          " = " +
          rolls.reduce((acc, val) => acc + val).toString()}
      </div>
    );
  }

  return (
    <div title={new Date(logEntry.timestamp).toLocaleString()}>
      {player?.name ?? "system"}: {logEntry.payload.text}
    </div>
  );
}

export function Log() {
  const { ids: logEntryIds, entities: logEntries } = useServerState(
    (state) => state.logEntries
  );
  const myself = useMyself();
  const dispatch = useServerDispatch();
  const [collapsed, setCollapsed] = useState(true);
  const lastLogEntry = logEntryIds.length
    ? byId(logEntries, logEntryIds[logEntryIds.length - 1]!)
    : null;
  const scrollRef = useRef<HTMLUListElement>(null);

  useLayoutEffect(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [collapsed]);

  useLayoutEffect(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      const scrollBottom = scrollElement.scrollTop + scrollElement.clientHeight;
      // we scroll down with new messages if the user is sufficiently close
      // enough to the bottom (150px)
      if (scrollElement.scrollHeight - scrollBottom < 150)
        scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  });

  return (
    <div className="log">
      <div className="log-title">
        <h2>Log</h2>
        <button
          onClick={() => {
            setCollapsed((collapsed) => !collapsed);
          }}
        >
          {collapsed ? "▲" : "▼"}
        </button>
      </div>
      {!collapsed ? (
        <>
          <ul ref={scrollRef} className="log-text">
            {logEntryIds.map((id) => {
              const logEntry = byId(logEntries, id)!;
              return (
                <li key={id}>
                  <LogEntry logEntry={logEntry} />
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
                  playerId: myself.id,
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
      ) : (
        lastLogEntry && <LogEntry logEntry={lastLogEntry} />
      )}
    </div>
  );
}
