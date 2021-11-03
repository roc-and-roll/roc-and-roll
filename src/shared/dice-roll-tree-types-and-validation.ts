import * as t from "typanion";
import { assert, IsExact } from "conditional-type-checks";
import { damageTypes } from "./state";

export const isDamageType = t.isObject({
  type: t.isEnum(damageTypes),
});

export type RRDamageType = t.InferType<typeof isDamageType>;

export type DiceRollTree<WithResults extends true | false> =
  DRTPartExpression<WithResults>;

export type DRTPartExpression<WithResults extends true | false> =
  | DRTPartTerm<WithResults>
  | DRTPartParens<WithResults>
  | DRTPartNegated<WithResults>
  | DRTPartDice<WithResults>
  | DRTPartNum;

interface DRTPart<T extends string> {
  type: T;
}

export interface DRTPartTerm<WithResults extends true | false>
  extends DRTPart<"term"> {
  operator: "*" | "/" | "+" | "-";
  operands: DRTPartExpression<WithResults>[];
}

export interface DRTPartParens<WithResults extends true | false>
  extends DRTPart<"parens"> {
  inner: DRTPartExpression<WithResults>;
}

export interface DRTPartDice<WithResults extends true | false>
  extends DRTPart<"dice"> {
  count: number;
  results: WithResults extends true ? number[] : "not-yet-rolled";
  modified: "none" | "advantage" | "disadvantage";
  faces: number;
  damage: RRDamageType;
}

export interface DRTPartNum extends DRTPart<"num"> {
  value: number;
  damage: RRDamageType;
}

export interface DRTPartNegated<WithResults extends true | false>
  extends DRTPart<"negated"> {
  inner: DRTPartExpression<WithResults>;
}

const __isDRTPartExpression = <WithResults extends true | false>(
  withResults: WithResults
) =>
  t.makeValidator({
    test: (value, state): value is DRTPartExpression<WithResults> =>
      isDRTPartExpression(withResults)(value, state),
  });

const isDRTPartParens = <WithResults extends true | false>(
  withResults: WithResults
) =>
  t.isObject({
    type: t.isLiteral("parens"),
    inner: __isDRTPartExpression(withResults),
  });

const isDRTPartNum = t.isObject({
  type: t.isLiteral("num"),
  value: t.isNumber(),
  damage: isDamageType,
});

const isDRTPartDice = <WithResults extends true | false>(
  withResults: WithResults
) =>
  t.applyCascade(
    t.isObject({
      type: t.isLiteral("dice"),
      count: t.isNumber(),
      results: t.makeValidator({
        test: (
          value,
          state
        ): value is WithResults extends true ? number[] : "not-yet-rolled" =>
          withResults
            ? t.isArray(t.isNumber())(value, state)
            : t.isLiteral("not-yet-rolled")(value, state),
      }),
      modified: t.isEnum(["none", "advantage", "disadvantage"] as const),
      faces: t.applyCascade(t.isNumber(), [t.isInteger(), t.isAtLeast(1)]),
      damage: isDamageType,
    }),
    [
      // Validate that count === results.length
      t.makeValidator<Record<string, unknown>>({
        test: (dicePart, state) => {
          if (!withResults) {
            return true;
          }
          if (
            !("results" in dicePart) ||
            !("count" in dicePart) ||
            !Array.isArray(dicePart["results"])
          ) {
            return false;
          }

          if (dicePart["results"].length === dicePart["count"]) {
            return true;
          }

          return t.pushError(
            state,
            `A rolled dicepart should have exactly as many dice roll results as its dice count (count = ${String(
              dicePart["count"]
            )}, results = ${String(dicePart["results"].length)})`
          );
        },
      }),
    ]
  );

const isDRTPartNegated = <WithResults extends true | false>(
  withResults: WithResults
) =>
  t.isObject({
    type: t.isLiteral("negated"),
    inner: __isDRTPartExpression(withResults),
  });

const isDRTPartTerm = <WithResults extends true | false>(
  withResults: WithResults
) =>
  t.isObject({
    type: t.isLiteral("term"),
    operator: t.isEnum(["*", "/", "+", "-"] as const),
    operands: t.applyCascade(t.isArray(__isDRTPartExpression(withResults)), [
      t.hasMinLength(2),
    ]),
  });

const isDRTPartExpression = <WithResults extends true | false>(
  withResults: WithResults
) =>
  t.isOneOf(
    [
      isDRTPartTerm(withResults),
      isDRTPartParens(withResults),
      isDRTPartNegated(withResults),
      isDRTPartDice(withResults),
      isDRTPartNum,
    ],
    { exclusive: true }
  );

export const isDiceRollTree = isDRTPartExpression;

const isDiceRollTreeWithoutResults = isDiceRollTree(false);
const isDiceRollTreeWithResults = isDiceRollTree(true);

// Make sure that the schema really matches the DiceRollTree type.
assert<
  IsExact<t.InferType<typeof isDiceRollTreeWithoutResults>, DiceRollTree<false>>
>(true);
assert<
  IsExact<t.InferType<typeof isDiceRollTreeWithResults>, DiceRollTree<true>>
>(true);
