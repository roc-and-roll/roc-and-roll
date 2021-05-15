import React from "react";
import { randomBetweenInclusive } from "../shared/random";
import {
  RRMultipleRoll,
  RRLogEntryDiceRoll,
  RRDamageType,
  RRDice,
  RRPlayerID,
  RRModifier,
} from "../shared/state";
import { assertNever } from "../shared/util";

export function rollInitiative(
  mod: number,
  multiple: RRMultipleRoll,
  playerId: RRPlayerID
): Omit<RRLogEntryDiceRoll, "id" | "type" | "timestamp"> {
  return {
    payload: {
      rollType: "initiative",
      dice: [rollD20(multiple), ...(mod === 0 ? [] : [modifier(mod)])],
    },
    silent: false,
    playerId,
  };
}

function modifier(
  modifier: number,
  damageType: RRDamageType = null
): RRModifier {
  return {
    type: "modifier",
    modifier,
    damageType,
  };
}

function rollD20(multiple: RRMultipleRoll = "none") {
  return roll({
    faces: 20,
    count: multiple == "none" ? 1 : 2,
    modified: multiple,
  });
}

export function roll({
  faces,
  count,
  damageType,
  modified,
  negated,
}: {
  faces: number;
  count: number;
  damageType?: RRDamageType;
  modified?: RRMultipleRoll;
  negated?: boolean;
}): RRDice {
  if (modified !== "none" && count <= 1) {
    count = 2;
  }
  const results = Array.from({ length: count }, () =>
    randomBetweenInclusive(1, faces)
  );
  return {
    type: "dice",
    faces,
    modified: modified ?? "none",
    diceResults: results,
    damageType: damageType ?? null,
    negated: negated ?? false,
  };
}

export function diceResultString(logEntry: RRLogEntryDiceRoll) {
  return logEntry.payload.dice
    .map((part) => {
      if (part.type === "modifier") {
        return <b>{part.modifier}</b>;
      }
      const prefix = part.negated ? "-" : "";
      if (part.type === "dice") {
        if (part.diceResults.length === 1) {
          return (
            <>
              {prefix}
              <b>{part.diceResults[0]!}</b> (d{part.faces})
            </>
          );
        }
        if (part.modified === "none") {
          return (
            <>
              {prefix}
              {part.diceResults
                .map((r) => (
                  <>
                    <b>{r}</b> (d{part.faces})
                  </>
                ))
                .reduce((prev, curr, index) => {
                  return (
                    <>
                      {prev} + {curr}
                    </>
                  );
                })}
            </>
          );
        }
        const boldValue =
          part.modified === "advantage"
            ? Math.max(...part.diceResults)
            : Math.min(...part.diceResults);
        return (
          <>
            {prefix}
            {part.modified === "advantage" ? "a" : "i"}(
            {part.diceResults
              .map((r) => {
                if (r === boldValue) {
                  return (
                    <>
                      <b>{r}</b> (d{part.faces})
                    </>
                  );
                } else {
                  return (
                    <>
                      {r} (d{part.faces})
                    </>
                  );
                }
              })
              .reduce((prev, curr, index) => {
                return (
                  <>
                    {prev}, {curr}
                  </>
                );
              })}
            )
          </>
        );
      }
      assertNever(part);
    })
    .reduce((prev, curr, index) => {
      return (
        <>
          {prev} + {curr}
        </>
      );
    });
}

export function diceResult(logEntry: RRLogEntryDiceRoll) {
  return logEntry.payload.dice
    .map((part) => {
      if (part.type === "modifier") {
        return part.modifier;
      }
      if (part.type === "dice") {
        const sign = part.negated ? -1 : 1;
        if (part.modified === "none") {
          return part.diceResults.reduce((sum, each) => sum + each) * sign;
        } else if (part.modified === "advantage") {
          return Math.max(...part.diceResults) * sign;
        } else if (part.modified === "disadvantage") {
          return Math.min(...part.diceResults) * sign;
        }
        assertNever(part.modified);
      }
      assertNever(part);
    })
    .reduce((sum, each) => sum + each);
}
