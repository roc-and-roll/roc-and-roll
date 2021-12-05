import React from "react";
import {
  DiceRollTree,
  DRTPartDice,
  DRTPartExpression,
  DRTPartNegated,
  DRTPartNum,
  DRTPartParens,
  DRTPartTerm,
  RRDamageType,
} from "../../shared/dice-roll-tree-types-and-validation";
import { randomBetweenInclusive } from "../../shared/random";
import {
  RRMultipleRoll,
  RRLogEntryDiceRoll,
  RRPlayerID,
  colorForDamageType,
  damageTypes,
} from "../../shared/state";
import { assertNever } from "../../shared/util";
import { contrastColor } from "../util";
import { DRTVisitor, parseDiceString } from "./grammar";

export function isValidDiceString(diceString: string) {
  try {
    parseDiceString(diceString);
    return true;
  } catch (err) {
    return false;
  }
}

export class RollVisitor extends DRTVisitor<DRTPartExpression<true>, false> {
  // You can overwrite this function in tests to roll deterministically.
  static rollFunction = randomBetweenInclusive;

  protected override visitNum(expression: DRTPartNum) {
    return expression;
  }

  protected override visitDice(expression: DRTPartDice<false>) {
    return {
      ...expression,
      results: Array.from({ length: expression.count }, () =>
        RollVisitor.rollFunction(1, expression.faces)
      ),
    };
  }

  protected override visitTerm(expression: DRTPartTerm<false>) {
    return {
      ...expression,
      operands: expression.operands.map((operand) => this.visit(operand)),
    };
  }

  protected override visitParens(expression: DRTPartParens<false>) {
    return {
      ...expression,
      inner: this.visit(expression.inner),
    };
  }

  protected override visitNegated(expression: DRTPartNegated<false>) {
    return {
      ...expression,
      inner: this.visit(expression.inner),
    };
  }
}

export function parseDiceStringAndRoll(diceString: string) {
  return rollDiceRollTree(parseDiceString(diceString));
}

export function rollDiceRollTree(diceRollTree: DiceRollTree<false>) {
  return new RollVisitor().visit(diceRollTree);
}

export function rollInitiative(
  modifier: number,
  multiple: RRMultipleRoll,
  playerId: RRPlayerID
): Omit<RRLogEntryDiceRoll, "id" | "type" | "timestamp"> {
  const d20 = rollD20(multiple);

  return {
    payload: {
      rollType: "initiative",
      rollName: "Intiative",
      diceRollTree:
        modifier === 0
          ? d20
          : {
              type: "term",
              operator: "+",
              operands: [
                d20,
                {
                  type: "num" as const,
                  value: modifier,
                  damage: {
                    type: null,
                  },
                },
              ],
            },
    },
    silent: false,
    playerId,
  };
}

function rollD20(multiple: RRMultipleRoll = "none"): DRTPartDice<true> {
  return roll({
    faces: 20,
    count: multiple === "none" ? 1 : 2,
    modified: multiple,
    damage: {
      type: null,
    },
  });
}

export function roll({
  faces,
  count,
  damage,
  modified,
}: {
  faces: number;
  count: number;
  damage: RRDamageType;
  modified?: RRMultipleRoll;
}): DRTPartDice<true> {
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
    count,
    results,
    damage,
  };
}

class FormatDiceRollVisitor extends DRTVisitor<React.ReactElement, true> {
  protected override visitNum(expression: DRTPartNum) {
    return <b>{expression.value}</b>;
  }

  protected override visitDice(expression: DRTPartDice<true>) {
    if (expression.results.length === 1) {
      return (
        <>
          <b>{expression.results[0]!}</b> (d{expression.faces})
        </>
      );
    }
    if (expression.modified === "none") {
      return (
        <>
          <b>
            [{expression.results.join(", ")}] ({expression.count}d
            {expression.faces})
          </b>
        </>
      );
    }
    const boldValue =
      expression.modified === "advantage"
        ? Math.max(...expression.results)
        : Math.min(...expression.results);
    return (
      <>
        {expression.modified === "advantage" ? "a" : "i"}(
        {expression.results
          .map((r) => {
            if (r === boldValue) {
              return (
                <>
                  <b>{r}</b> (d{expression.faces})
                </>
              );
            } else {
              return (
                <>
                  {r} (d{expression.faces})
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

  protected override visitTerm(expression: DRTPartTerm<true>) {
    return expression.operands
      .map((operand) => this.visit(operand))
      .reduce((prev, curr) => {
        return (
          <>
            {prev} {expression.operator} {curr}
          </>
        );
      });
  }

  protected override visitParens(expression: DRTPartParens<true>) {
    return <>({this.visit(expression.inner)})</>;
  }

  protected override visitNegated(expression: DRTPartNegated<true>) {
    return <>-({this.visit(expression.inner)})</>;
  }
}

export function diceResultString(diceRollTree: DiceRollTree<true>) {
  return new FormatDiceRollVisitor().visit(diceRollTree);
}

class SumVisitor extends DRTVisitor<number, true> {
  protected override visitNum(expression: DRTPartNum) {
    return expression.value;
  }

  protected override visitDice(expression: DRTPartDice<true>) {
    switch (expression.modified) {
      case "none":
        return expression.results.reduce((sum, each) => sum + each);
      case "advantage":
        return Math.max(...expression.results);
      case "disadvantage":
        return Math.min(...expression.results);
      default:
    }
    assertNever(expression.modified);
  }

  protected override visitTerm(expression: DRTPartTerm<true>) {
    return expression.operands
      .map((operand) => this.visit(operand))
      .reduce((a, b) => {
        switch (expression.operator) {
          case "+":
            return a + b;
          case "-":
            return a - b;
          case "*":
            return a * b;
          case "/":
            return a / b;
          default:
            assertNever(expression.operator);
        }
      });
  }

  protected override visitParens(expression: DRTPartParens<true>) {
    return this.visit(expression.inner);
  }

  protected override visitNegated(expression: DRTPartNegated<true>) {
    return -this.visit(expression.inner);
  }
}

export function diceResult(diceRollTree: DiceRollTree<true>) {
  return new SumVisitor().visit(diceRollTree);
}

type DamageSumMap = Record<
  NonNullable<RRDamageType["type"]> | "unspecified",
  number
>;

class SumWithDamageTypeVisitor extends DRTVisitor<DamageSumMap, true> {
  private makeMap(): DamageSumMap {
    return {
      unspecified: 0,
      slashing: 0,
      piercing: 0,
      bludgeoning: 0,
      poison: 0,
      acid: 0,
      fire: 0,
      cold: 0,
      radiant: 0,
      necrotic: 0,
      lightning: 0,
      thunder: 0,
      force: 0,
      psychic: 0,
    };
  }

  private op(
    fn: (a: number, b: number) => number,
    a: DamageSumMap,
    b: DamageSumMap
  ) {
    const result = this.makeMap();
    for (const damageType of damageTypes) {
      result[damageType ?? "unspecified"] = fn(
        a[damageType ?? "unspecified"],
        b[damageType ?? "unspecified"]
      );
    }
    return result;
  }

  protected override visitNum(expression: DRTPartNum): DamageSumMap {
    const damageType = expression.damage.type ?? "unspecified";

    return {
      ...this.makeMap(),
      [damageType]: expression.value,
    };
  }

  protected override visitDice(expression: DRTPartDice<true>): DamageSumMap {
    const damageType = expression.damage.type ?? "unspecified";

    switch (expression.modified) {
      case "none":
        return {
          ...this.makeMap(),
          [damageType]: expression.results.reduce((sum, each) => sum + each),
        };
      case "advantage":
        return {
          ...this.makeMap(),
          [damageType]: Math.max(...expression.results),
        };
      case "disadvantage":
        return {
          ...this.makeMap(),
          [damageType]: Math.min(...expression.results),
        };
      default:
    }
    assertNever(expression.modified);
  }

  protected override visitTerm(expression: DRTPartTerm<true>): DamageSumMap {
    return expression.operands
      .map((operand) => this.visit(operand))
      .reduce((a, b) =>
        this.op(
          (a, b) => {
            switch (expression.operator) {
              case "+":
                return a + b;
              case "-":
                return a - b;
              case "*":
                return a * b;
              case "/":
                return a / b;
              default:
                assertNever(expression.operator);
            }
          },
          a,
          b
        )
      );
  }

  protected override visitParens(
    expression: DRTPartParens<true>
  ): DamageSumMap {
    return this.visit(expression.inner);
  }

  protected override visitNegated(
    expression: DRTPartNegated<true>
  ): DamageSumMap {
    return this.op(
      (damage) => -damage,
      this.visit(expression.inner),
      this.makeMap()
    );
  }
}

export function DiceResultWithTypes({
  logEntry,
}: {
  logEntry: RRLogEntryDiceRoll;
}) {
  const total = diceResult(logEntry.payload.diceRollTree);
  const damageTypeSums = new SumWithDamageTypeVisitor().visit(
    logEntry.payload.diceRollTree
  );

  function onlyHasUnspecifiedDamage(damageTypeSums: DamageSumMap) {
    for (const damageType of damageTypes) {
      if (damageType === null) {
        continue;
      }
      if (damageTypeSums[damageType] !== 0) {
        return false;
      }
    }
    return true;
  }

  return (
    <>
      <strong>{total}</strong>
      {!onlyHasUnspecifiedDamage(damageTypeSums) && (
        <>
          {" ("}
          {(
            Object.entries(damageTypeSums) as Array<
              [keyof DamageSumMap, number]
            >
          ).map(([type, sum]) => {
            if (sum === 0 || isNaN(sum)) {
              // Division by 0 may result in NaN.
              return null;
            }
            const color = colorForDamageType(
              type === "unspecified" ? null : type
            );
            return (
              <span
                key={type}
                className="dice-results-per-damage"
                style={{
                  backgroundColor: color,
                  color: contrastColor(color),
                }}
                title={type}
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
