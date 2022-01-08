import * as z from "zod";
import { assert, IsExact } from "conditional-type-checks";
import { isRRID } from "../../../shared/validation";
import {
  conditionNames,
  damageTypesWithoutNull,
  MakeRRID,
  RRCharacterCondition,
} from "../../../shared/state";
import { RRDamageType } from "../../../shared/dice-roll-tree-types-and-validation";

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

const __isTextEntryRecursive: z.ZodSchema<CompendiumTextEntry> = z.lazy(
  () => isTextEntry
);

export const isTextEntry = z.union([
  z.string(),
  z.strictObject({
    type: z.literal("entries"),
    name: z.string(),
    entries: z.array(__isTextEntryRecursive),
  }),
  z.strictObject({
    type: z.literal("list"),
    items: z.array(__isTextEntryRecursive),
  }),
  z.strictObject({
    type: z.literal("table"),
    caption: z.optional(z.string()),
    colLabels: z.array(z.string()),
    colStyles: z.array(z.unknown()),
    rows: z.array(z.array(__isTextEntryRecursive)),
  }),
  z.strictObject({
    type: z.literal("cell"),
    roll: z.union([
      z.strictObject({
        exact: z.number().int().min(0),
      }),
      z.strictObject({
        min: z.number().int().min(0),
        max: z.number().int().min(0),
        pad: z.optional(z.boolean()),
      }),
    ]),
  }),
]);

// Make sure that the schema really matches the TextEntry type.
assert<IsExact<z.infer<typeof isTextEntry>, CompendiumTextEntry>>(true);

type MaybeArray<T> = T | T[];

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
  otherSources?: { source: string; page?: number }[];
  time: Array<
    | { number: number; unit: "action" | "bonus" | "minute" | "hour" }
    | { number: number; unit: "reaction"; condition: string }
  >;
  entries: CompendiumTextEntry[];
  entriesHigherLevel?: CompendiumTextEntry[];
  srd?: boolean | string;
  hasFluff?: boolean;
  hasFluffImages?: boolean;
  school: "V" | "N" | "E" | "A" | "C" | "T" | "I" | "D";
  damageInflict?: Array<NonNullable<RRDamageType["type"]>>;
  damageResist?: Array<NonNullable<RRDamageType["type"]>>;
  damageImmune?: Array<NonNullable<RRDamageType["type"]>>;
  damageVulnerable?: Array<NonNullable<RRDamageType["type"]>>;
  conditionInflict?: Array<RRCharacterCondition>;
  savingThrow?: Array<
    | "strength"
    | "dexterity"
    | "constitution"
    | "intelligence"
    | "wisdom"
    | "charisma"
  >;
  abilityCheck?: Array<
    | "strength"
    | "dexterity"
    | "constitution"
    | "intelligence"
    | "wisdom"
    | "charisma"
  >;
  spellAttack?: Array<"R" | "M">;
  miscTags?: string[];
  areaTags?: string[];
  classes: {
    fromClassList?: {
      name: string;
      source: string;
      definedInSource?: string;
    }[];
    fromClassListVariant?: {
      name: string;
      source: string;
      definedInSource?: string;
    }[];
    fromSubclass?: {
      class: { name: string; source: string };
      subclass: { name: string; source: string; subSubclass?: string };
    }[];
  };
  races?: {
    name: string;
    source: string;
    baseName?: string;
    baseSource?: string;
  }[];
  backgrounds?: {
    name: string;
    source: string;
  }[];
  eldritchInvocations?: { name: string; source: string }[];
  scalingLevelDice?: MaybeArray<{
    label: string;
    scaling: Record<number, string>;
  }>;
  meta?: {
    ritual?: boolean;
  };
};

const isScalingLevelDice = z.strictObject({
  label: z.string(),
  scaling: z.record(z.string().regex(/^\d{1,2}$/), z.string()),
});
export const isSpell = z.strictObject({
  components: z.strictObject({
    v: z.optional(z.boolean()),
    s: z.optional(z.boolean()),
    m: z.optional(
      z.union([
        z.string(),
        z.strictObject({
          text: z.string(),
          cost: z.optional(z.number().int().min(0)),
          consume: z.optional(z.union([z.boolean(), z.literal("optional")])),
        }),
      ])
    ),
  }),
  duration: z.array(
    z.union([
      z.strictObject({
        type: z.enum(["instant", "special"] as const),
      }),
      z.strictObject({
        type: z.literal("permanent"),
        ends: z.array(z.enum(["dispel", "trigger"] as const)),
      }),
      z.strictObject({
        type: z.literal("timed"),
        duration: z.strictObject({
          type: z.enum(["round", "minute", "hour", "day"] as const),
          amount: z.number().int().min(0),
          upTo: z.optional(z.boolean()),
        }),
        concentration: z.optional(z.boolean()),
      }),
    ])
  ),
  level: z.number().int().min(0),
  name: z.string(),
  range: z.union([
    z.strictObject({
      type: z.enum([
        "point",
        "radius",
        "line",
        "cone",
        "hemisphere",
        "sphere",
        "cube",
      ] as const),
      distance: z.strictObject({
        type: z.enum(["feet", "miles"] as const),
        amount: z.number().int().min(0),
      }),
    }),
    z.strictObject({
      type: z.literal("point"),
      distance: z.strictObject({
        type: z.enum(["self", "touch", "sight", "unlimited"] as const),
      }),
    }),
    z.strictObject({ type: z.literal("special") }),
  ]),
  source: z.string(),
  page: z.number().int().min(0),
  otherSources: z.optional(
    z.array(
      z.strictObject({
        source: z.string(),
        page: z.optional(z.number().int().min(0)),
      })
    )
  ),
  time: z.array(
    z.union([
      z.strictObject({
        number: z.number().int().min(0),
        unit: z.enum(["action", "bonus", "minute", "hour"] as const),
      }),
      z.strictObject({
        number: z.number().int().min(0),
        unit: z.literal("reaction"),
        condition: z.string(),
      }),
    ])
  ),
  entries: z.array(isTextEntry),
  entriesHigherLevel: z.optional(z.array(isTextEntry)),
  srd: z.optional(
    // If this is a string, then the spell has a different name in the SRD.
    z.union([z.boolean(), z.string()])
  ),
  hasFluff: z.optional(z.boolean()),
  hasFluffImages: z.optional(z.boolean()),
  school: z.enum(["V", "N", "E", "A", "C", "T", "I", "D"] as const),
  damageInflict: z.optional(z.array(z.enum(damageTypesWithoutNull))),
  damageResist: z.optional(z.array(z.enum(damageTypesWithoutNull))),
  damageImmune: z.optional(z.array(z.enum(damageTypesWithoutNull))),
  damageVulnerable: z.optional(z.array(z.enum(damageTypesWithoutNull))),
  conditionInflict: z.optional(z.array(z.enum(conditionNames))),
  savingThrow: z.optional(
    z.array(
      z.enum([
        "strength",
        "dexterity",
        "constitution",
        "intelligence",
        "wisdom",
        "charisma",
      ] as const)
    )
  ),
  abilityCheck: z.optional(
    z.array(
      z.enum([
        "strength",
        "dexterity",
        "constitution",
        "intelligence",
        "wisdom",
        "charisma",
      ] as const)
    )
  ),
  spellAttack: z.optional(z.array(z.enum(["R", "M"] as const))),
  miscTags: z.optional(z.array(z.string())),
  areaTags: z.optional(z.array(z.string())),
  classes: z.strictObject({
    fromClassList: z.optional(
      z.array(
        z.strictObject({
          name: z.string(),
          source: z.string(),
          definedInSource: z.optional(z.string()),
        })
      )
    ),
    fromClassListVariant: z.optional(
      z.array(
        z.strictObject({
          name: z.string(),
          source: z.string(),
          definedInSource: z.optional(z.string()),
        })
      )
    ),
    fromSubclass: z.optional(
      z.array(
        z.strictObject({
          class: z.strictObject({
            name: z.string(),
            source: z.string(),
          }),
          subclass: z.strictObject({
            name: z.string(),
            source: z.string(),
            subSubclass: z.optional(z.string()),
          }),
        })
      )
    ),
  }),
  races: z.optional(
    z.array(
      z.strictObject({
        name: z.string(),
        source: z.string(),
        baseName: z.optional(z.string()),
        baseSource: z.optional(z.string()),
      })
    )
  ),
  backgrounds: z.optional(
    z.array(
      z.strictObject({
        name: z.string(),
        source: z.string(),
      })
    )
  ),
  eldritchInvocations: z.optional(
    z.array(z.strictObject({ name: z.string(), source: z.string() }))
  ),
  scalingLevelDice: z.optional(
    z.union([isScalingLevelDice, z.array(isScalingLevelDice)])
  ),
  meta: z.optional(
    z.strictObject({
      ritual: z.optional(z.boolean()),
    })
  ),
});

// Make sure that the schema really matches the Spell type.
assert<IsExact<z.infer<typeof isSpell>, CompendiumSpell>>(true);

export const isCompendiumData = z.strictObject({
  spell: z.array(isSpell),
});

export type CompendiumData = {
  spell: CompendiumSpell[];
};

// Make sure that the schema really matches the CompendiumData type.
assert<IsExact<z.infer<typeof isCompendiumData>, CompendiumData>>(true);

export type CompendiumSourceID = MakeRRID<"compendiumSource">;

export type CompendiumSource = {
  id: CompendiumSourceID;
  title: string;
  meta: string;
  data: CompendiumData;
};

export const isCompendiumSource = z.strictObject({
  id: isRRID<CompendiumSourceID>(),
  title: z.string(),
  meta: z.string(),
  data: isCompendiumData,
});

// Make sure that the schema really matches the TextEntry type.
assert<IsExact<z.infer<typeof isCompendiumSource>, CompendiumSource>>(true);
