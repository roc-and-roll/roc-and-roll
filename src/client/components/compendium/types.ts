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
  | { type: "list"; style?: string; items: CompendiumTextEntry[] }
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
    }
  | {
      type: "inset";
      page: number;
      source: string;
      name: string;
      entries: CompendiumTextEntry[];
    }
  | {
      type: "item";
      name: string;
      entry?: CompendiumTextEntry;
      entries?: CompendiumTextEntry[];
      style?: string;
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
    style: z.optional(z.string()),
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
  z.strictObject({
    type: z.literal("inset"),
    page: z.number().int().min(0),
    source: z.string(),
    name: z.string(),
    entries: z.array(__isTextEntryRecursive),
  }),
  z.strictObject({
    type: z.literal("item"),
    name: z.string(),
    entry: z.optional(__isTextEntryRecursive),
    entries: z.optional(z.array(__isTextEntryRecursive)),
    style: z.optional(z.string()),
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
  basicRules?: boolean;
  affectsCreatureType?: Array<string>; //todo be more precise here
  conditionImmune?: Array<RRCharacterCondition>;
  additionalSources?: { page: number; source: string }[];
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
  basicRules: z.optional(z.boolean()),
  affectsCreatureType: z.optional(z.array(z.string())),
  conditionImmune: z.optional(z.array(z.enum(conditionNames))),
  additionalSources: z.optional(
    z.array(
      z.strictObject({ page: z.number().int().min(0), source: z.string() })
    )
  ),
});

// Make sure that the schema really matches the Spell type.
assert<IsExact<z.infer<typeof isSpell>, CompendiumSpell>>(true);

export type ConditionalSpeed = {
  number: number;
  condition: string;
};

export type CompendiumMonster = {
  name: string;
  source: string;
  imageUrl?: string;
  page: number;
  size?: string;
  ac?: (
    | {
        ac?: number;
        from?: string[];
        special?: string;
        condition?: string;
        braces?: boolean;
      }
    | number
  )[];
  hp?: { special?: string; average?: number; formula?: string };
  speed?: {
    walk?: number | ConditionalSpeed;
    climb?: number | ConditionalSpeed;
    fly?: number | ConditionalSpeed;
    canHover?: boolean;
    swim?: number | ConditionalSpeed;
    burrow?: number | ConditionalSpeed;
  };
  str?: number;
  dex?: number;
  con?: number;
  int?: number;
  wis?: number;
  cha?: number;

  action?: { name: string; entries: CompendiumTextEntry[] }[];

  type?: any;
  alignment?: any;
  hasToken?: boolean;
  senses?: any;
  passive?: any;
  trait?: any;
  senseTags?: any;
  damageTags?: any;
  miscTags?: any;
  immune?: any;
  conditionImmune?: any;
  otherSources?: any;
  skill?: any;
  languages?: any;
  cr?: any;
  environment?: any;
  soundClip?: any;
  languageTags?: any;
  hasFluff?: any;
  hasFluffImages?: any;
  srd?: any;
  save?: any;
  legendary?: any;
  legendaryGroup?: any;
  traitTags?: any;
  actionTags?: any;
  conditionInflict?: any;
  conditionInflictLegendary?: any;
  summonedBySpell?: any;
  pbNote?: any;
  summonedByClass?: any;
  _copy?: any;
  resist?: any;
  reaction?: any;
  bonus?: any;
  actionNote?: any;
  sizeNote?: any;
  vulnerable?: any;
  group?: any;
  variant?: any;
  dragonCastingColor?: any;
  basicRules?: any;
  spellcasting?: any; //cspell: disable-line
  spellcastingTags?: any; //cspell: disable-line
  condition?: any;
  conditionInflictSpell?: any;
  braces?: any;
  _verses?: any;
  _versions?: any;
  altArt?: any;
  familiar?: any;
  legendaryHeader?: any;
  alias?: any;
};

export const isConditionalSpeed = z.strictObject({
  number: z.number(),
  condition: z.string(),
});

export const isMonster = z.strictObject({
  name: z.string(),
  source: z.string(),
  page: z.number().int().min(0),
  imageUrl: z.optional(z.string()),
  size: z.optional(z.string()),
  type: z.any(),
  alignment: z.optional(z.any()),
  ac: z.optional(
    z.array(
      z
        .strictObject({
          ac: z.optional(z.number()),
          from: z.optional(z.array(z.string())),
          special: z.optional(z.string()),
          condition: z.optional(z.string()),
          braces: z.optional(z.boolean()),
        })
        .or(z.number())
    )
  ),
  hp: z.optional(
    z.strictObject({
      special: z.optional(z.string()),
      average: z.optional(z.number()),
      formula: z.optional(z.string()),
    })
  ),
  speed: z.optional(
    z.strictObject({
      walk: z.optional(z.number().or(isConditionalSpeed)),
      climb: z.optional(z.number().or(isConditionalSpeed)),
      fly: z.optional(z.number().or(isConditionalSpeed)),
      swim: z.optional(z.number().or(isConditionalSpeed)),
      burrow: z.optional(z.number().or(isConditionalSpeed)),
      canHover: z.optional(z.boolean()),
    })
  ),
  str: z.optional(z.number()),
  dex: z.optional(z.number()),
  con: z.optional(z.number()),
  int: z.optional(z.number()),
  wis: z.optional(z.number()),
  cha: z.optional(z.number()),
  hasToken: z.optional(z.boolean()),

  action: z.optional(
    z.array(z.strictObject({ name: z.string(), entries: z.array(isTextEntry) }))
  ),

  senses: z.any(),
  passive: z.any(),
  trait: z.any(),
  senseTags: z.any(),
  damageTags: z.any(),
  miscTags: z.any(),
  immune: z.any(),
  conditionImmune: z.any(),
  otherSources: z.any(),
  skill: z.any(),
  languages: z.any(),
  cr: z.any(),
  environment: z.any(),
  soundClip: z.any(),
  languageTags: z.any(),
  hasFluff: z.any(),
  hasFluffImages: z.any(),
  srd: z.any(),
  save: z.any(),
  legendary: z.any(),
  legendaryGroup: z.any(),
  traitTags: z.any(),
  actionTags: z.any(),
  conditionInflict: z.any(),
  conditionInflictLegendary: z.any(),
  summonedBySpell: z.any(),
  pbNote: z.any(),
  summonedByClass: z.any(),
  _copy: z.any(),
  resist: z.any(),
  reaction: z.any(),
  bonus: z.any(),
  actionNote: z.any(),
  sizeNote: z.any(),
  vulnerable: z.any(),
  group: z.any(),
  variant: z.any(),
  dragonCastingColor: z.any(),
  basicRules: z.any(),
  spellcasting: z.any(), //cspell: disable-line
  spellcastingTags: z.any(), //cspell: disable-line
  condition: z.any(),
  conditionInflictSpell: z.any(),
  braces: z.any(),
  _verses: z.any(),
  _versions: z.any(),
  altArt: z.any(),
  familiar: z.any(),
  legendaryHeader: z.any(),
  alias: z.any(),
});

// Make sure that the schema really matches the Spell type.
assert<IsExact<z.infer<typeof isMonster>, CompendiumMonster>>(true);

export const isCompendiumData = z.strictObject({
  spell: z.array(isSpell),
  monster: z.optional(z.array(isMonster)),
});

export type CompendiumData = {
  spell: CompendiumSpell[];
  monster?: CompendiumMonster[];
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
