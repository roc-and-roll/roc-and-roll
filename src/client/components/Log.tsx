import React, { useState } from "react";
import { logEntryMessageAdd } from "../../shared/actions";
import { byId, entries, RRLogEntry } from "../../shared/state";
import { assertNever, withDo } from "../../shared/util";
import { useMyself } from "../myself";
import { diceResultString, DiceResultWithTypes } from "../roll";
import { useServerDispatch, useServerState } from "../state";
import { useScrollToBottom } from "../useScrollToBottom";
import { formatTimestamp } from "../util";
import { achievements } from "./achievementList";
import { CollapseButton } from "./CollapseButton";
import { Button } from "./ui/Button";

function LogEntry({ logEntry }: { logEntry: RRLogEntry }) {
  const { entities: players } = useServerState((state) => state.players);
  const player = logEntry.playerId ? byId(players, logEntry.playerId) : null;
  const playerName = player?.name ?? "Unknown Player";

  let content;

  switch (logEntry.type) {
    case "diceRoll":
      content = (
        <>
          {playerName}: {diceResultString(logEntry)} ={" "}
          <u>
            <DiceResultWithTypes logEntry={logEntry} />
          </u>
        </>
      );
      break;
    case "achievement": {
      const achievement = achievements.find(
        (a) => a.id === logEntry.payload.achievementId
      );
      content = (
        <>
          {playerName} unlocked: {achievement?.name ?? "Unknown Achievement"}
        </>
      );
      break;
    }
    case "message":
      content = (
        <>
          {playerName}: {logEntry.payload.text}
        </>
      );
      break;
    default:
      assertNever(logEntry);
  }

  return <div title={formatTimestamp(logEntry.timestamp)}>{content}</div>;
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
            {withDo(entries(logEntriesCollection), (logEntries) =>
              logEntries.flatMap((logEntry, i) => {
                const lastLogEntry = logEntries[i - 1] ?? null;
                const diff =
                  logEntry.timestamp - (lastLogEntry?.timestamp ?? 0);

                const elements = [];

                if (diff >= 1000 * 60 * 60 * 3) {
                  // >=3 hours distance
                  elements.push(
                    <li
                      key={`${logEntry.id} ${lastLogEntry?.id ?? "---"}`}
                      className="log-divider-timestamp"
                    >
                      {formatTimestamp(logEntry.timestamp)}
                    </li>
                  );
                } else if (diff >= 1000 * 90) {
                  // >=90 seconds distance
                  elements.push(
                    <li
                      key={`${logEntry.id} ${lastLogEntry?.id ?? "--"}`}
                      className="log-divider-small"
                    />
                  );
                }

                elements.push(
                  <li key={logEntry.id}>
                    <LogEntry logEntry={logEntry} />
                  </li>
                );

                return elements;
              })
            )}
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
        lastLogEntry && (
          <div className="log-preview">
            <LogEntry logEntry={lastLogEntry} />
          </div>
        )
      )}
    </div>
  );
}
