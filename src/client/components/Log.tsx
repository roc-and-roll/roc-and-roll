import React from "react";
import { logEntryMessageAdd } from "../../shared/actions";
import { entries, RRLogEntry } from "../../shared/state";
import { assertNever, withDo } from "../../shared/util";
import { useMyId } from "../myself";
import { usePrompt } from "../dialog-boxes";
import { diceResultString, DiceResultWithTypes } from "../roll";
import { useServerDispatch, useServerState } from "../state";
import { useScrollToBottom } from "../useScrollToBottom";
import { formatTimestamp, linkify } from "../util";
import { achievements } from "./achievementList";
import { Button } from "./ui/Button";

function LogEntry({ logEntry }: { logEntry: RRLogEntry }) {
  const { entities: players } = useServerState((state) => state.players);
  const player = logEntry.playerId ? players[logEntry.playerId] : null;
  const playerName = player?.name ?? "Unknown Player";

  let content;

  switch (logEntry.type) {
    case "diceRoll":
      content = (
        <>
          {playerName} rolled
          {logEntry.payload.rollName && ` ${logEntry.payload.rollName}`}:{" "}
          {diceResultString(logEntry)} ={" "}
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
          {playerName}: {linkify(logEntry.payload.text)}
        </>
      );
      break;
    default:
      assertNever(logEntry);
  }

  return <div title={formatTimestamp(logEntry.timestamp)}>{content}</div>;
}

export const Log = React.memo(function Log() {
  const logEntriesCollection = useServerState((state) => state.logEntries);
  const myId = useMyId();
  const dispatch = useServerDispatch();
  const [scrollRef] = useScrollToBottom<HTMLUListElement>([false]);
  const prompt = usePrompt();

  return (
    <div className="log">
      <ul ref={scrollRef} className="log-text">
        {withDo(entries(logEntriesCollection), (logEntries) =>
          logEntries.flatMap((logEntry, i) => {
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
          })
        )}
      </ul>
      <Button
        onClick={async () => {
          const text = await prompt("Type your message");
          if (text === null) {
            return;
          }
          dispatch(
            logEntryMessageAdd({
              playerId: myId,
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
