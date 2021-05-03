import React, { useState } from "react";
import { logEntryMessageAdd } from "../../shared/actions";
import { byId, entries, RRLogEntry } from "../../shared/state";
import { useMyself } from "../myself";
import { diceResult, diceResultString } from "../roll";
import { useServerDispatch, useServerState } from "../state";
import { useScrollToBottom } from "../useScrollToBottom";
import { formatTimestamp } from "../util";
import { achievements } from "./Achievements";
import { CollapseButton } from "./CollapseButton";
import { Button } from "./ui/Button";

function LogEntry(props: { logEntry: RRLogEntry }) {
  const { entities: players } = useServerState((state) => state.players);
  const { logEntry } = props;
  const player = logEntry.playerId ? byId(players, logEntry.playerId) : null;

  if (logEntry.type === "diceRoll") {
    return (
      <div title={formatTimestamp(logEntry.timestamp)}>
        {player?.name ?? "system"}: {diceResultString(logEntry)} ={" "}
        {diceResult(logEntry)}
      </div>
    );
  }

  if (logEntry.type === "achievement") {
    const achievement = achievements.find(
      (a) => a.id === logEntry.payload.achievementId
    );
    return (
      <div title={formatTimestamp(logEntry.timestamp)}>
        {player?.name ?? "system"}
        {` unlocked: ${achievement?.name ?? ""}`}
      </div>
    );
  }

  return (
    <div title={formatTimestamp(logEntry.timestamp)}>
      {player?.name ?? "system"}: {logEntry.payload.text}
    </div>
  );
}

export function Log() {
  const logEntriesCollection = useServerState((state) => state.logEntries);
  const myself = useMyself();
  const dispatch = useServerDispatch();
  const [collapsed, setCollapsed] = useState(true);
  const lastLogEntry = logEntriesCollection.ids.length
    ? byId(
        logEntriesCollection.entities,
        logEntriesCollection.ids[logEntriesCollection.ids.length - 1]!
      )
    : null;
  const [scrollRef] = useScrollToBottom<HTMLUListElement>([collapsed]);

  return (
    <div className="log">
      <div className="log-title">
        <h2>Log</h2>
        <CollapseButton collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>
      {!collapsed ? (
        <>
          <ul ref={scrollRef} className="log-text">
            {entries(logEntriesCollection).map((logEntry) => (
              <li key={logEntry.id}>
                <LogEntry logEntry={logEntry} />
              </li>
            ))}
          </ul>
          <Button
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
          </Button>
        </>
      ) : (
        lastLogEntry && <LogEntry logEntry={lastLogEntry} />
      )}
    </div>
  );
}
