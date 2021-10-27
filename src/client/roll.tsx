import React from "react";
import { randomBetweenInclusive } from "../shared/random";
import {
  RRMultipleRoll,
  RRLogEntryDiceRoll,
  RRDice,
  RRPlayerID,
  RRModifier,
  RRDamageType,
  colorForDamageType,
} from "../shared/state";
import { assertNever } from "../shared/util";
import { contrastColor } from "./util";

export function rollInitiative(
  mod: number,
  multiple: RRMultipleRoll,
  playerId: RRPlayerID
): Omit<RRLogEntryDiceRoll, "id" | "type" | "timestamp"> {
  return {
    payload: {
      rollType: "initiative",
      rollName: "Intiative",
      dice: [rollD20(multiple), ...(mod === 0 ? [] : [modifier(mod)])],
    },
    silent: false,
    playerId,
  };
}

function modifier(
  modifier: number,
  damageType: RRDamageType = {
    type: null,
    modifiers: [],
  }
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
    count: multiple === "none" ? 1 : 2,
    modified: multiple,
    damage: {
      type: null,
      modifiers: [],
    },
  });
}

export function roll({
  faces,
  count,
  damage,
  modified,
  negated,
}: {
  faces: number;
  count: number;
  damage: RRDamageType;
  modified?: RRMultipleRoll;
  negated?: boolean;
}): RRDice {
  if (modified !== undefined && modified !== "none" && count <= 1) {
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
    damageType: damage,
    negated: negated ?? false,
  };
}

export function diceResultString(logEntry: RRLogEntryDiceRoll) {
  let isFirst = true;
  const emit = (prefix: string) => {
    if (isFirst) {
      isFirst = false;
      return "";
    } else {
      return prefix;
    }
  };

  return logEntry.payload.dice
    .map((part) => {
      switch (part.type) {
        case "modifier":
          return (
            <b>{`${emit(part.modifier >= 0 ? "+" : "")} ${part.modifier}`}</b>
          );
        case "dice": {
          const prefix = () => (part.negated ? "-" : emit("+"));
          if (part.diceResults.length === 1) {
            return (
              <>
                {prefix()}
                <b>{part.diceResults[0]!}</b> (d{part.faces})
              </>
            );
          }
          if (part.modified === "none") {
            return (
              <>
                {part.diceResults
                  .map((r) => (
                    <>
                      <b>{r}</b> (d{part.faces})
                    </>
                  ))
                  .reduce((prev, curr) => {
                    return (
                      <>
                        {prev} {prefix()} {curr}
                      </>
                    );
                  }, <></>)}
              </>
            );
          }
          const boldValue =
            part.modified === "advantage"
              ? Math.max(...part.diceResults)
              : Math.min(...part.diceResults);
          return (
            <>
              {prefix()}
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
                .reduce((prev, curr) => {
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
        default:
          assertNever(part);
      }
    })
    .reduce(
      (prev, curr) => (
        <>
          {" "}
          {prev} {curr}{" "}
        </>
      ),
      <></>
    );
}

export function diceResult(logEntry: RRLogEntryDiceRoll) {
  return logEntry.payload.dice
    .map((part) => {
      switch (part.type) {
        case "modifier":
          return part.modifier;
        case "dice":
          {
            const sign = part.negated ? -1 : 1;
            switch (part.modified) {
              case "none":
                return (
                  part.diceResults.reduce((sum, each) => sum + each) * sign
                );
              case "advantage":
                return Math.max(...part.diceResults) * sign;
              case "disadvantage":
                return Math.min(...part.diceResults) * sign;
              default:
                assertNever(part.modified);
            }
          }
          break;
        default:
          assertNever(part);
      }
    })
    .reduce((sum, each) => sum + each, 0);
}

export function DiceResultWithTypes({
  logEntry,
}: {
  logEntry: RRLogEntryDiceRoll;
}) {
  const total = diceResult(logEntry);
  const damageTypeSums = new Map<string, { type: RRDamageType; sum: number }>();

  logEntry.payload.dice.forEach((part) => {
    let subSum: number;
    switch (part.type) {
      case "modifier":
        subSum = part.modifier;
        break;
      case "dice":
        {
          const sign = part.negated ? -1 : 1;
          switch (part.modified) {
            case "none":
              subSum =
                part.diceResults.reduce((sum, each) => sum + each) * sign;
              break;
            case "advantage":
              subSum = Math.max(...part.diceResults) * sign;
              break;
            case "disadvantage":
              subSum = Math.min(...part.diceResults) * sign;
              break;
            default:
              assertNever(part.modified);
          }
        }
        break;
      default:
        assertNever(part);
    }

    const key = `${part.damageType.type ?? ""}:${part.damageType.modifiers.join(
      ":"
    )}`;
    damageTypeSums.set(key, {
      type: part.damageType,
      sum: (damageTypeSums.get(key)?.sum ?? 0) + subSum,
    });
  });

  return (
    <>
      <strong>{total}</strong>
      {!(
        damageTypeSums.size === 1 &&
        [...damageTypeSums.values()][0]!.type.type === null
      ) && (
        <>
          {" ("}
          {[...damageTypeSums.entries()].map(([key, { type, sum }]) => {
            const color = colorForDamageType(type.type);
            return (
              <span
                className="dice-results-per-damage"
                key={key}
                style={{
                  backgroundColor: color,
                  color: contrastColor(color),
                }}
                title={type.type ?? "unspecified"}
              >
                {sum}
              </span>
            );
          })}
          )
        </>
      )}
    </>
  );
}
