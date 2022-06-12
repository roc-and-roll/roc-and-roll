import React, { useState } from "react";
import { logEntryMessageAdd } from "../../shared/actions";
import { RRLogEntry } from "../../shared/state";
import { assertNever } from "../../shared/util";
import { useMyProps } from "../myself";
import { usePrompt } from "../dialog-boxes";
import { diceResultString, DiceResultWithTypes } from "../dice-rolling/roll";
import { useServerDispatch, useServerState } from "../state";
import { useScrollToBottom } from "../useScrollToBottom";
import { formatTimestamp, getLogRollName, linkify, nl2br } from "../util";
import { achievements } from "./achievementList";
import { Button } from "./ui/Button";
import { useRRSettings } from "../settings";

const LogEntry = React.memo<{ logEntry: RRLogEntry }>(function LogEntry({
  logEntry,
}) {
  const playerName =
    useServerState((state) =>
      logEntry.playerId ? state.players.entities[logEntry.playerId]?.name : null
    ) ?? "Unknown Player";

  const [{ logNames }] = useRRSettings();
  const characters = useServerState((s) => s.characters);

  let content;

  switch (logEntry.type) {
    case "diceRoll":
      content = (
        <>
          {getLogRollName(
            playerName,
            characters,
            logNames,
            logEntry.payload.characterIds
          )}{" "}
          rolled
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

  const tooltip: string =
    logEntry.type === "diceRoll" ? (logEntry.payload.tooltip ?? "") + " " : "";

  return (
    <div title={tooltip + formatTimestamp(logEntry.timestamp)}>{content}</div>
  );
});

export function CollapsedLog() {
  const lastLogEntry = useServerState((state) => {
    const lastId = state.logEntries.ids[state.logEntries.ids.length - 1];
    return !lastId ? null : state.logEntries.entities[lastId]!;
  });

  return (
    <div className="p-2 line-clamp-3">
      {lastLogEntry ? (
        <LogEntry logEntry={lastLogEntry} />
      ) : (
        <em>Nothing here yet. Try rolling some dice!</em>
      )}
    </div>
  );
}

export const ENTRIES_PER_PAGE = 100;

export const Log = React.memo(function Log() {
  const logEntries = useServerState((state) => state.logEntries);
  const [offset, setOffset] = useState(() =>
    Math.max(0, logEntries.ids.length - ENTRIES_PER_PAGE)
  );
  const myself = useMyProps("id");
  const dispatch = useServerDispatch();
  const [scrollRef] = useScrollToBottom<HTMLUListElement>([false]);
  const prompt = usePrompt();

  const rows = [];
  for (let i = offset; i < logEntries.ids.length; i++) {
    const id = logEntries.ids[i]!;
    const logEntry = logEntries.entities[id]!;
    const previousId = logEntries.ids[i - 1];
    const previousLogEntry =
      previousId !== undefined ? logEntries.entities[previousId] : null;

    const diff = logEntry.timestamp - (previousLogEntry?.timestamp ?? 0);

    if (diff >= 1000 * 60 * 60 * 3) {
      // >=3 hours distance
      rows.push(
        <li
          key={`${logEntry.id} ${previousLogEntry?.id ?? "---"}`}
          className="log-divider-timestamp"
        >
          {formatTimestamp(logEntry.timestamp)}
        </li>
      );
    } else if (diff >= 1000 * 90) {
      // >=90 seconds distance
      rows.push(
        <li
          key={`${logEntry.id} ${previousLogEntry?.id ?? "--"}`}
          className="log-divider-small"
        />
      );
    }

    rows.push(
      <li key={logEntry.id}>
        <LogEntry logEntry={logEntry} />
      </li>
    );
  }

  return (
    <div className="py-2">
      <ul ref={scrollRef} className="log-text px-2 mb-2">
        {offset > 0 && (
          <li className="text-center text-orange-300">
            <Button
              onClick={() =>
                setOffset((offset) => Math.max(0, offset - ENTRIES_PER_PAGE))
              }
            >
              load older entries
            </Button>
          </li>
        )}
        {rows}
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
              payload: { text },
            })
          );
        }}
      >
        add message
      </Button>
    </div>
  );
});
