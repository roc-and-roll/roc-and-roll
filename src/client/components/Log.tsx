import React from "react";
import { logEntryMessageAdd } from "../../shared/actions";
import { entries, RRLogEntry } from "../../shared/state";
import { assertNever } from "../../shared/util";
import { useMyProps } from "../myself";
import { usePrompt } from "../dialog-boxes";
import { diceResultString, DiceResultWithTypes } from "../dice-rolling/roll";
import { useServerDispatch, useServerState } from "../state";
import { useScrollToBottom } from "../useScrollToBottom";
import { formatTimestamp, linkify, nl2br } from "../util";
import { achievements } from "./achievementList";
import { Button } from "./ui/Button";

const LogEntry = React.memo<{ logEntry: RRLogEntry }>(function LogEntry({
  logEntry,
}) {
  const playerName =
    useServerState((state) =>
      logEntry.playerId ? state.players.entities[logEntry.playerId]?.name : null
    ) ?? "Unknown Player";

  let content;

  switch (logEntry.type) {
    case "diceRoll":
      content = (
        <>
          {playerName} rolled
          {logEntry.payload.rollName && ` ${logEntry.payload.rollName}`}:{" "}
          {diceResultString(logEntry.payload.diceRollTree)} ={" "}
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
          {playerName}:{" "}
          {linkify(logEntry.payload.text).map((text) =>
            typeof text !== "string" ? text : nl2br(text)
          )}
        </>
      );
      break;
    default:
      assertNever(logEntry);
  }

  return <div title={formatTimestamp(logEntry.timestamp)}>{content}</div>;
});

export function CollapsedLog() {
  const lastLogEntry = useServerState((state) => {
    const lastId = state.logEntries.ids[state.logEntries.ids.length - 1];
    if (!lastId) {
      return null;
    }
    return state.logEntries.entities[lastId];
  });

  return (
    <div className="p-2 line-clamp-3">
      {lastLogEntry ? <LogEntry logEntry={lastLogEntry} /> : null}
    </div>
  );
}

export const Log = React.memo(function Log() {
  const logEntriesCollection = useServerState((state) => state.logEntries);
  const myself = useMyProps("id");
  const dispatch = useServerDispatch();
  const [scrollRef] = useScrollToBottom<HTMLUListElement>([false]);
  const prompt = usePrompt();

  return (
    <div className="py-2">
      <ul ref={scrollRef} className="log-text px-2 mb-2">
        {entries(logEntriesCollection).flatMap((logEntry, i, logEntries) => {
          const lastLogEntry = logEntries[i - 1] ?? null;
          const diff = logEntry.timestamp - (lastLogEntry?.timestamp ?? 0);

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
        })}
      </ul>
      <Button
        className="mx-2"
        onClick={async () => {
          const text = (await prompt("Type your message", "", true))?.trim();
          if (text === undefined || text.length === 0) {
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
    </div>
  );
});
