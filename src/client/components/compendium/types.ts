import * as t from "typanion";
import { assert, IsExact } from "conditional-type-checks";
import { Opaque } from "type-fest";
import { RRID } from "../../../shared/state";

export type CompendiumTextEntry =
  | string
  | { type: "entries"; name: string; entries: CompendiumTextEntry[] }
  | { type: "list"; items: CompendiumTextEntry[] }
  | {
      type: "table";
      caption?: string;
      colLabels: string[];
      colStyles: unknown[];
      rows: CompendiumTextEntry[][];
    }
  | {
      type: "cell";
      roll: { min: number; max: number; pad?: boolean } | { exact: number };
    };

const __isTextEntryRecursive = t.makeValidator({
  test: (value, state): value is CompendiumTextEntry =>
    isTextEntry(value, state),
});

export const isTextEntry = t.isOneOf([
  t.isString(),
  t.isObject({
    type: t.isLiteral("entries"),
    name: t.isString(),
    entries: t.isArray(__isTextEntryRecursive),
  }),
  t.isObject({
    type: t.isLiteral("list"),
    items: t.isArray(__isTextEntryRecursive),
  }),
  t.isObject({
    type: t.isLiteral("table"),
    caption: t.isOptional(t.isString()),
    colLabels: t.isArray(t.isString()),
    colStyles: t.isArray(t.isUnknown()),
    rows: t.isArray(t.isArray(__isTextEntryRecursive)),
  }),
  t.isObject({
    type: t.isLiteral("cell"),
    roll: t.isOneOf(
      [
        t.isObject({
          exact: t.applyCascade(t.isNumber(), [t.isInteger(), t.isPositive()]),
        }),
        t.isObject({
          min: t.applyCascade(t.isNumber(), [t.isInteger(), t.isPositive()]),
          max: t.applyCascade(t.isNumber(), [t.isInteger(), t.isPositive()]),
          pad: t.isOptional(t.isBoolean()),
        }),
      ],
      { exclusive: true }
    ),
  }),
]);

// Make sure that the schema really matches the TextEntry type.
assert<IsExact<t.InferType<typeof isTextEntry>, CompendiumTextEntry>>(true);

export type CompendiumSpell = {
  components: {
    v?: boolean;
    s?: boolean;
    m?:
      | string
      | { text: string; cost?: number; consume?: boolean | "optional" };
  };
  duration: Array<
    | { type: "instant" | "special" }
    | { type: "permanent"; ends: Array<"dispel" | "trigger"> }
    | {
        type: "timed";
        duration: {
          type: "round" | "minute" | "hour" | "day";
          amount: number;
          upTo?: boolean;
        };
        concentration?: boolean;
      }
  >;
  level: number;
  name: string;
  range:
    | {
        type:
          | "point"
          | "radius"
          | "line"
          | "cone"
          | "hemisphere"
          | "sphere"
          | "cube";
        distance: {
          type: "feet" | "miles";
          amount: number;
        };
      }
    | {
        type: "point";
        distance: {
          type: "self" | "touch" | "sight" | "unlimited";
        };
      }
    | { type: "special" };
  source: string;
  page: number;
  time: Array<
    | { number: number; unit: "action" | "bonus" | "minute" | "hour" }
    | { number: number; unit: "reaction"; condition: string }
  >;
  entries: CompendiumTextEntry[];
  entriesHigherLevel?: CompendiumTextEntry[];
  srd?: boolean | string;
};

export const isSpell = t.isObject(
  {
    components: t.isObject({
      v: t.isOptional(t.isBoolean()),
      s: t.isOptional(t.isBoolean()),
      m: t.isOptional(
        t.isOneOf(
          [
            t.isString(),
            t.isObject({
              text: t.isString(),
              cost: t.isOptional(
                t.applyCascade(t.isNumber(), [t.isInteger(), t.isPositive()])
              ),
              consume: t.isOptional(
                t.isOneOf([t.isBoolean(), t.isLiteral("optional")], {
                  exclusive: true,
                })
              ),
            }),
          ],
          { exclusive: true }
        )
      ),
    }),
    duration: t.isArray(
      t.isOneOf(
        [
          t.isObject({
            type: t.isOneOf([t.isLiteral("instant"), t.isLiteral("special")], {
              exclusive: true,
            }),
          }),
          t.isObject({
            type: t.isLiteral("permanent"),
            ends: t.isArray(
              t.isOneOf([t.isLiteral("dispel"), t.isLiteral("trigger")], {
                exclusive: true,
              })
            ),
          }),
          t.isObject({
            type: t.isLiteral("timed"),
            duration: t.isObject({
              type: t.isOneOf(
                [
                  t.isLiteral("round"),
                  t.isLiteral("minute"),
                  t.isLiteral("hour"),
                  t.isLiteral("day"),
                ],
                { exclusive: true }
              ),
              amount: t.applyCascade(t.isNumber(), [
                t.isInteger(),
                t.isPositive(),
              ]),
              upTo: t.isOptional(t.isBoolean()),
            }),
            concentration: t.isOptional(t.isBoolean()),
          }),
        ],
        { exclusive: true }
      )
    ),
    level: t.applyCascade(t.isNumber(), [t.isInteger(), t.isPositive()]),
    name: t.isString(),
    range: t.isOneOf(
      [
        t.isObject({
          type: t.isOneOf(
            [
              t.isLiteral("point"),
              t.isLiteral("radius"),
              t.isLiteral("line"),
              t.isLiteral("cone"),
              t.isLiteral("hemisphere"),
              t.isLiteral("sphere"),
              t.isLiteral("cube"),
            ],
            { exclusive: true }
          ),
          distance: t.isObject({
            type: t.isOneOf([t.isLiteral("feet"), t.isLiteral("miles")], {
              exclusive: true,
            }),
            amount: t.applyCascade(t.isNumber(), [
              t.isInteger(),
              t.isPositive(),
            ]),
          }),
        }),
        t.isObject({
          type: t.isLiteral("point"),
          distance: t.isObject({
            type: t.isOneOf(
              [
                t.isLiteral("self"),
                t.isLiteral("touch"),
                t.isLiteral("sight"),
                t.isLiteral("unlimited"),
              ],
              { exclusive: true }
            ),
          }),
        }),
        t.isObject({ type: t.isLiteral("special") }),
      ],
      {
        exclusive: true,
      }
    ),
    source: t.isString(),
    page: t.applyCascade(t.isNumber(), [t.isInteger(), t.isPositive()]),
    time: t.isArray(
      t.isOneOf(
        [
          t.isObject({
            number: t.applyCascade(t.isNumber(), [
              t.isInteger(),
              t.isPositive(),
            ]),
            unit: t.isOneOf(
              [
                t.isLiteral("action"),
                t.isLiteral("bonus"),
                t.isLiteral("minute"),
                t.isLiteral("hour"),
              ],
              { exclusive: true }
            ),
          }),
          t.isObject({
            number: t.applyCascade(t.isNumber(), [
              t.isInteger(),
              t.isPositive(),
            ]),
            unit: t.isLiteral("reaction"),
            condition: t.isString(),
          }),
        ],
        { exclusive: true }
      )
    ),
    entries: t.isArray(isTextEntry),
    entriesHigherLevel: t.isOptional(t.isArray(isTextEntry)),
    srd: t.isOptional(
      // If this is a string, then the spell has a different name in the SRD.
      t.isOneOf([t.isBoolean(), t.isString()], { exclusive: true })
    ),
  },
  // There are a lot more properties, which we currently ignore.
  { extra: t.isUnknown() }
);

// Make sure that the schema really matches the Spell type.
assert<IsExact<t.InferType<typeof isSpell>, CompendiumSpell>>(true);

export const isCompendiumData = t.isObject({
  spell: t.isArray(isSpell),
});

export type CompendiumData = {
  spell: CompendiumSpell[];
};

// Make sure that the schema really matches the CompendiumData type.
assert<IsExact<t.InferType<typeof isCompendiumData>, CompendiumData>>(true);

export type CompendiumSourceID = Opaque<string, "compendiumSource">;

export type CompendiumSource = {
  id: CompendiumSourceID;
  title: string;
  meta: string;
  data: CompendiumData;
};

function isRRID<ID extends RRID>() {
  return t.makeValidator({
    test: (value, state): value is ID =>
      t.applyCascade(t.isString(), [t.hasExactLength(21)])(value, state),
  });
}

export const isCompendiumSource = t.isObject({
  id: isRRID<CompendiumSourceID>(),
  title: t.isString(),
  meta: t.isString(),
  data: isCompendiumData,
});

// Make sure that the schema really matches the TextEntry type.
assert<IsExact<t.InferType<typeof isCompendiumSource>, CompendiumSource>>(true);
