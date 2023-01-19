import * as z from "zod";
import { assert, IsExact } from "conditional-type-checks";
import {
  conditionNames,
  damageTypesWithoutNull,
  RRCharacterCondition,
} from "../state";
import { RRDamageType } from "../dice-roll-tree-types-and-validation";
import { ForceNoInlineHelper } from "../typescript-hacks";
import { CompendiumTextEntry, isTextEntry } from "./text-entry";

// TODO also handle hidden entries some how, right now they are displayed as normal text entries
export type PotentiallyHiddenCompendiumTextEntry =
  | CompendiumTextEntry
  | { hidden: boolean; entry: CompendiumTextEntry };

export const isPotentiallyHiddenTextEntry = z.union([
  isTextEntry,
  z.strictObject({
    hidden: z.boolean(),
    entry: isTextEntry,
  }),
]);

export interface ConditionalSpeed {
  number: number;
  condition: string;
}

export interface CompendiumMonsterSkills {
  acrobatics?: string;
  "animal handling"?: string;
  arcana?: string;
  athletics?: string;
  deception?: string;
  insight?: string;
  intimidation?: string;
  investigation?: string;
  history?: string;
  medicine?: string;
  nature?: string;
  perception?: string;
  performance?: string;
  persuasion?: string;
  religion?: string;
  "sleight of hand"?: string;
  stealth?: string;
  survival?: string;
}

interface SpellPerLevel {
  slots?: number;
  spells: string[];
  lower?: number;
}

export interface CompendiumMonster {
  name: string;
  source: string;
  imageUrl?: string;
  page: number;
  size?: Array<"G" | "H" | "M" | "L" | "S" | "T">;
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

  action?: { name: string; entries: CompendiumTextEntry[] }[] | null;
  legendary?: { name: string; entries: CompendiumTextEntry[] }[];
  legendaryActions?: number;
  legendaryGroup?: { name: string; source: string };

  immune?: Array<
    | NonNullable<RRDamageType["type"]>
    | {
        immune: Array<NonNullable<RRDamageType["type"]>>;
        cond?: boolean;
        note?: string;
        preNote?: string;
      }
  >;
  conditionImmune?: Array<RRCharacterCondition>;
  skill?: CompendiumMonsterSkills & { other?: any };
  save?: {
    str?: string;
    dex?: string;
    con?: string;
    int?: string;
    wis?: string;
    cha?: string;
  };

  trait?: { name: string; entries: CompendiumTextEntry[]; type?: any }[] | null;
  //cspell: disable-next-line
  spellcasting?: {
    name: string;
    headerEntries: CompendiumTextEntry[];
    will?: PotentiallyHiddenCompendiumTextEntry[];
    daily?: {
      "3e"?: PotentiallyHiddenCompendiumTextEntry[];
      "3"?: PotentiallyHiddenCompendiumTextEntry[];
      "2e"?: PotentiallyHiddenCompendiumTextEntry[];
      "2"?: PotentiallyHiddenCompendiumTextEntry[];
      "1e"?: PotentiallyHiddenCompendiumTextEntry[];
      "1"?: PotentiallyHiddenCompendiumTextEntry[];
    };
    hidden?: string[];
    ability?: string;
    footerEntries?: CompendiumTextEntry[];
    spells?: {
      0?: { spells: string[] };
      1?: SpellPerLevel;
      2?: SpellPerLevel;
      3?: SpellPerLevel;
      4?: SpellPerLevel;
      5?: SpellPerLevel;
      6?: SpellPerLevel;
      7?: SpellPerLevel;
      8?: SpellPerLevel;
      9?: SpellPerLevel;
    };
    displayAs?: any;
    type?: any;
    charges?: any;
    chargesItem?: any;
  }[];

  type?: any;
  alignment?: any;
  hasToken?: boolean;
  senses?: any;
  passive?: any;
  senseTags?: any;
  damageTags?: any;
  damageTagsLegendary?: any;
  damageTagsSpell?: any;
  miscTags?: any;
  otherSources?: any;
  languages?: any;
  cr?: any;
  environment?: any;
  soundClip?: any;
  languageTags?: any;
  hasFluff?: any;
  hasFluffImages?: any;
  srd?: any;
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
  isNamedCreature?: any;
  reprintedAs?: any;
  summonedBySpellLevel?: any;
  dragonAge?: any;
  isNpc?: any;
  alignmentPrefix?: any;
  mythic?: any;
  shortName?: any;
}

export const isConditionalSpeed = z.strictObject({
  number: z.number(),
  condition: z.string(),
});

const spellPerLevel = z.strictObject({
  slots: z.optional(z.number().int()),
  spells: z.array(z.string()),
  lower: z.optional(z.number().int()),
});

const _isMonster = z.strictObject({
  name: z.string(),
  source: z.string(),
  page: z.number().int().min(0),
  imageUrl: z.optional(z.string()),
  size: z.optional(z.array(z.enum(["G", "H", "M", "L", "S", "T"]))),
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

  action: z
    .optional(
      z.array(
        z.strictObject({ name: z.string(), entries: z.array(isTextEntry) })
      )
    )
    .nullable(),
  legendary: z.optional(
    z.array(z.strictObject({ name: z.string(), entries: z.array(isTextEntry) }))
  ),
  legendaryActions: z.optional(z.number().int()),
  legendaryGroup: z.optional(
    z.strictObject({
      name: z.string(),
      source: z.string(),
    })
  ),

  immune: z.optional(
    z.array(
      z.enum(damageTypesWithoutNull).or(
        z.strictObject({
          immune: z.array(z.enum(damageTypesWithoutNull)),
          cond: z.optional(z.boolean()),
          note: z.optional(z.string()),
          preNote: z.optional(z.string()),
        })
      )
    )
  ),
  conditionImmune: z.optional(z.array(z.enum(conditionNames))),
  skill: z.optional(
    z.strictObject({
      acrobatics: z.optional(z.string()),
      "animal handling": z.optional(z.string()),
      arcana: z.optional(z.string()),
      athletics: z.optional(z.string()),
      deception: z.optional(z.string()),
      history: z.optional(z.string()),
      insight: z.optional(z.string()),
      intimidation: z.optional(z.string()),
      investigation: z.optional(z.string()),
      medicine: z.optional(z.string()),
      nature: z.optional(z.string()),
      perception: z.optional(z.string()),
      performance: z.optional(z.string()),
      persuasion: z.optional(z.string()),
      religion: z.optional(z.string()),
      "sleight of hand": z.optional(z.string()),
      stealth: z.optional(z.string()),
      survival: z.optional(z.string()),
      other: z.optional(z.any()),
    })
  ),
  save: z.optional(
    z.strictObject({
      str: z.optional(z.string()),
      dex: z.optional(z.string()),
      con: z.optional(z.string()),
      int: z.optional(z.string()),
      wis: z.optional(z.string()),
      cha: z.optional(z.string()),
    })
  ),

  trait: z.nullable(
    z.optional(
      z.array(
        z.strictObject({
          name: z.string(),
          entries: z.array(isTextEntry),
          type: z.any(),
        })
      )
    )
  ),
  //cspell: disable-next-line
  spellcasting: z.optional(
    z.array(
      z.strictObject({
        name: z.string(),
        headerEntries: z.array(isTextEntry),
        footerEntries: z.optional(z.array(isTextEntry)),
        will: z.optional(z.array(isPotentiallyHiddenTextEntry)),
        daily: z.optional(
          z.strictObject({
            "3e": z.optional(z.array(isPotentiallyHiddenTextEntry)), // I don't know what the difference between 3 and 3e is, they both seem to mean 3 times per day
            "3": z.optional(z.array(isPotentiallyHiddenTextEntry)),
            "2e": z.optional(z.array(isPotentiallyHiddenTextEntry)),
            "2": z.optional(z.array(isPotentiallyHiddenTextEntry)),
            "1e": z.optional(z.array(isPotentiallyHiddenTextEntry)),
            "1": z.optional(z.array(isPotentiallyHiddenTextEntry)),
          })
        ),
        ability: z.optional(z.string()),
        hidden: z.optional(z.array(z.string())),
        spells: z.optional(
          z.strictObject({
            0: z.optional(z.strictObject({ spells: z.array(z.string()) })),
            1: z.optional(spellPerLevel),
            2: z.optional(spellPerLevel),
            3: z.optional(spellPerLevel),
            4: z.optional(spellPerLevel),
            5: z.optional(spellPerLevel),
            6: z.optional(spellPerLevel),
            7: z.optional(spellPerLevel),
            8: z.optional(spellPerLevel),
            9: z.optional(spellPerLevel),
          })
        ),
        displayAs: z.any(),
        type: z.any(),
        charges: z.any(),
        chargesItem: z.any(),
      })
    )
  ),

  senses: z.any(),
  passive: z.any(),
  senseTags: z.any(),
  damageTags: z.any(),
  damageTagsLegendary: z.any(),
  damageTagsSpell: z.any(),
  miscTags: z.any(),
  otherSources: z.any(),
  languages: z.any(),
  cr: z.any(),
  environment: z.any(),
  soundClip: z.any(),
  languageTags: z.any(),
  hasFluff: z.any(),
  hasFluffImages: z.any(),
  srd: z.any(),
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
  isNamedCreature: z.any(),
  reprintedAs: z.any(),
  summonedBySpellLevel: z.any(),
  dragonAge: z.any(),
  isNpc: z.any(),
  alignmentPrefix: z.any(),
  mythic: z.any(),
  shortName: z.any(),
});
// TypeScript hack to avoid inlining.
// https://github.com/microsoft/TypeScript/issues/34119
export interface _isMonsterType
  extends ForceNoInlineHelper<typeof _isMonster> {}

export const isMonster: _isMonsterType = _isMonster;

// Make sure that the schema really matches the Spell type.
assert<IsExact<z.infer<typeof isMonster>, CompendiumMonster>>(true);
