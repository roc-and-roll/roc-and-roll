import * as z from "zod";
import { assert, IsExact } from "conditional-type-checks";
import { damageTypesWithoutNull } from "./state";

export const isDamageType = z.strictObject({
  // z.enum only works with strings, therefore we cannot use `damageTypes`
  // and instead use `damageTypesWithoutNull` and make it nullable after the
  // fact.
  type: z.enum(damageTypesWithoutNull).nullable(),
});

export type RRDamageType = z.infer<typeof isDamageType>;

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
): z.ZodSchema<DRTPartExpression<WithResults>> =>
  z.lazy(() => isDRTPartExpression(withResults));

const isDRTPartParens = <WithResults extends true | false>(
  withResults: WithResults
) =>
  z.strictObject({
    type: z.literal("parens"),
    inner: __isDRTPartExpression(withResults),
  });
const isDRTPartNum = z.strictObject({
  type: z.literal("num"),
  value: z.number(),
  damage: isDamageType,
});
const isDRTPartDice = <WithResults extends true | false>(
  withResults: WithResults
): z.ZodSchema<DRTPartDice<WithResults>> => {
  const baseSchema = z.strictObject({
    type: z.literal("dice"),
    count: z.number(),
    modified: z.enum(["none", "advantage", "disadvantage"]),
    faces: z.number().int().min(1),
    damage: isDamageType,
  });
  if (!withResults) {
    const schema: z.ZodSchema<DRTPartDice<false>> = baseSchema.extend({
      results: z.literal("not-yet-rolled"),
    });
    return schema as any;
  } else {
    const schema: z.ZodSchema<DRTPartDice<true>> = baseSchema
      .extend({ results: z.array(z.number()) })
      .superRefine((dicePart, ctx) => {
        if (dicePart["results"].length !== dicePart["count"]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `A rolled dice part should have exactly as many dice roll results as its dice count (count = ${dicePart["count"]}, results = ${dicePart.results.length})`,
            path: ["results"],
          });
        }
      });

    return schema as any;
  }
};

const isDRTPartNegated = <WithResults extends true | false>(
  withResults: WithResults
) =>
  z.strictObject({
    type: z.literal("negated"),
    inner: __isDRTPartExpression(withResults),
  });
const isDRTPartTerm = <WithResults extends true | false>(
  withResults: WithResults
) =>
  z.strictObject({
    type: z.literal("term"),
    operator: z.enum(["*", "/", "+", "-"] as const),
    operands: z.array(__isDRTPartExpression(withResults)).min(2),
  });
const isDRTPartExpression = <WithResults extends true | false>(
  withResults: WithResults
) =>
  z.union([
    isDRTPartTerm(withResults),
    isDRTPartParens(withResults),
    isDRTPartNegated(withResults),
    isDRTPartDice(withResults),
    isDRTPartNum,
  ]);

export const isDiceRollTree = isDRTPartExpression;

const isDiceRollTreeWithoutResults = isDiceRollTree(false);
const isDiceRollTreeWithResults = isDiceRollTree(true);

// Make sure that the schema really matches the DiceRollTree type.
assert<
  IsExact<z.infer<typeof isDiceRollTreeWithoutResults>, DiceRollTree<false>>
>(true);
assert<IsExact<z.infer<typeof isDiceRollTreeWithResults>, DiceRollTree<true>>>(
  true
);
