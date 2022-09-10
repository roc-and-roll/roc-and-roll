import * as z from "zod";
import { assert, IsExact } from "conditional-type-checks";
import {
  conditionNames,
  multipleRollValues,
  RRActiveMusicID,
  RRAssetID,
  RRCharacterID,
  RRDiceTemplateID,
  RRDiceTemplatePartID,
  RRID,
  RRInitiativeTrackerEntryID,
  RRLogEntryID,
  RRMapID,
  RRMapObjectID,
  RRPlayerID,
  RRPrivateChatID,
  RRPrivateChatMessageID,
  SyncedState,
  RRSoundSetID,
  RRPlaylistEntryID,
  RRPlaylistID,
  characterStatNames,
  proficiencyValues,
  categoryIcons,
  RRDiceTemplateCategoryID,
  isProficiencyValue,
  RRCharacterSpellID,
} from "./state";
import { withDo } from "./util";
import tinycolor from "tinycolor2";
import {
  isDamageType,
  isDiceRollTree,
  RRDamageType,
} from "./dice-roll-tree-types-and-validation";
import { isBlurhashValid as isBlurHashValid } from "blurhash"; //cspell: disable-line

function hasUniqueItems<I, S>(
  map: (item: I) => S
): z.RefinementEffect<I[]>["refinement"] {
  return (array, ctx) => {
    const seen = new Set<S>();
    for (const item of array) {
      const mappedItem = map(item);
      if (seen.has(mappedItem)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Array has duplicate items.",
        });
      }
      seen.add(mappedItem);
    }
  };
}

export const isRRID = <ID extends RRID>() =>
  z.custom<ID>().superRefine((val, ctx) => {
    const validator = z.string().length(21);
    const validationResult = validator.safeParse(val);
    if (!validationResult.success) {
      validationResult.error.issues.forEach((issue) => ctx.addIssue(issue));
    }
  });

function isEntityCollection<S extends z.ZodSchema<{ id: RRID }>>(
  entitySchema: S
) {
  return z.strictObject({
    entities: z.record(isRRID<z.infer<S>["id"]>(), entitySchema),
    ids: z
      .array(isRRID<z.infer<S>["id"]>())
      .superRefine(hasUniqueItems((id) => id)),
  });
}

const isColor = z
  .string()
  .refine((value) => tinycolor(value).isValid(), { message: "Invalid color" });

const isBlurHash = z.string().superRefine((value, ctx) => {
  const validationResult = isBlurHashValid(value);
  if (!validationResult.result) {
    ctx.addIssue({
      message: `Invalid BlurHash. ${validationResult.errorReason ?? ""}`,
      code: z.ZodIssueCode.custom,
    });
  }
});

const isRRPoint = z.strictObject({
  x: z.number(),
  y: z.number(),
});
const isTimestamp = z.number().int().min(0);

const sharedAssetValidators = {
  id: isRRID<RRAssetID>(),
  name: z.string(),
  description: z.nullable(z.string()),
  tags: z.array(z.string()),

  location: z.union([
    z.strictObject({
      type: z.literal("external"),
      url: z.string().url(),
    }),
    z.strictObject({
      type: z.literal("local"),
      filename: z.string(),
      originalFilename: z.string(),
      mimeType: z.string(),
    }),
  ]),

  playerId: z.nullable(isRRID<RRPlayerID>()),
  extra: z.record(z.unknown()),
};

const isRRAssetSong = z.strictObject({
  ...sharedAssetValidators,
  type: z.literal("song"),
  duration: z.number().min(1),
});
const isRRAssetImage = z.strictObject({
  ...sharedAssetValidators,
  type: z.literal("image"),
  width: z.number().int().min(0),
  height: z.number().int().min(0),
  blurHash: isBlurHash,

  originalFunction: z.enum(["token", "map", "unknown"] as const),
});
const isRRAssetOther = z.strictObject({
  ...sharedAssetValidators,
  type: z.literal("other"),
});
const isRRAsset = z.union([isRRAssetSong, isRRAssetImage, isRRAssetOther]);

const isVolume = z.number().min(0).max(1);

export const isStateVersion = z.number().int().min(0);

const isRollType = z.enum(["initiative", "hit", "attack"] as const).nullable();

export interface _RRDiceTemplate {
  id: RRDiceTemplateID;
  name: string;
  notes: string;
  parts: (
    | { id: RRDiceTemplatePartID; type: "template"; template: _RRDiceTemplate }
    | {
        id: RRDiceTemplatePartID;
        type: "dice";
        count: number;
        faces: number;
        negated: boolean;
        damage: RRDamageType;
        modified: typeof multipleRollValues[number];
      }
    | {
        id: RRDiceTemplatePartID;
        type: "modifier";
        number: number;
        damage: RRDamageType;
      }
    | {
        id: RRDiceTemplatePartID;
        type: "linkedModifier";
        damage: RRDamageType;
        name: "initiative" | "level";
      }
    | {
        id: RRDiceTemplatePartID;
        type: "linkedProficiency";
        damage: RRDamageType;
        proficiency: proficiencyValues;
      }
    | {
        id: RRDiceTemplatePartID;
        type: "linkedStat";
        name: typeof characterStatNames[number];
        damage: RRDamageType;
      }
  )[];
  rollType: z.infer<typeof isRollType>;
}

const __isDiceTemplateRecursive: z.ZodSchema<_RRDiceTemplate> = z.lazy(
  () => isDiceTemplate
);

const createBasicDiceTemplatePart = <T>(extra: T) =>
  z.union(
    withDo({ id: isRRID<RRDiceTemplatePartID>() }, (sharedValidators) => [
      z.strictObject({
        ...sharedValidators,
        ...extra,
        type: z.literal("dice"),
        count: z.number().int().min(0),
        faces: z.number().int().min(0),
        negated: z.boolean(),
        damage: isDamageType,
        modified: z.enum(multipleRollValues),
      }),
      z.strictObject({
        ...sharedValidators,
        ...extra,
        type: z.literal("template"),
        template: __isDiceTemplateRecursive,
      }),
      z.strictObject({
        ...sharedValidators,
        ...extra,
        type: z.literal("modifier"),
        number: z.number().int(),
        damage: isDamageType,
      }),
      z.strictObject({
        ...sharedValidators,
        ...extra,
        type: z.literal("linkedModifier"),
        name: z.union([z.literal("initiative"), z.literal("level")]),
        damage: isDamageType,
      }),
      z.strictObject({
        ...sharedValidators,
        ...extra,
        type: z.literal("linkedProficiency"),
        damage: isDamageType,
        proficiency: isProficiencyValue,
      }),
      z.strictObject({
        ...sharedValidators,
        ...extra,
        type: z.literal("linkedStat"),
        name: z.enum(characterStatNames),
        damage: isDamageType,
      }),
    ])
  );

const isDie = createBasicDiceTemplatePart({ x: z.number(), y: z.number() });
const isDiceTemplatePart = createBasicDiceTemplatePart({});
export type RRDie = z.infer<typeof isDie>;

const isDiceTemplate = z.strictObject({
  id: isRRID<RRDiceTemplateID>(),
  name: z.string(),
  notes: z.string(),
  parts: z
    .array(isDiceTemplatePart)
    .superRefine(hasUniqueItems((part) => part.id)),
  rollType: isRollType,
});
export type RRDiceTemplate = z.infer<typeof isDiceTemplate>;

assert<IsExact<RRDiceTemplate, _RRDiceTemplate>>(true);

const isDiceTemplateCategory = z.strictObject({
  id: isRRID<RRDiceTemplateCategoryID>(),
  icon: z.enum(categoryIcons),
  categoryName: z.string(),
  templates: z
    .array(isDiceTemplate)
    .superRefine(hasUniqueItems((diceTemplate) => diceTemplate.id)),
});
export type RRDiceTemplateCategory = z.infer<typeof isDiceTemplateCategory>;

const mapObjectBaseSharedValidators = {
  id: isRRID<RRMapObjectID>(),
  position: isRRPoint,
  rotation: z.number(),
  playerId: isRRID<RRPlayerID>(),
};

const mapObjectDrawingSharedValidators = {
  ...mapObjectBaseSharedValidators,
  visibility: z.enum(["gmOnly", "everyone"] as const),
  locked: z.boolean(),
  color: isColor,
  roughness: z.number(),
};

export const isSyncedState = z.strictObject({
  version: isStateVersion,
  globalSettings: z.strictObject({
    musicIsGMOnly: z.boolean(),
  }),
  initiativeTracker: z.strictObject({
    visible: z.boolean(),
    entries: isEntityCollection(
      z.union(
        withDo(
          {
            id: isRRID<RRInitiativeTrackerEntryID>(),
            initiative: z.number().int().min(0),
          },
          (sharedValidators) => [
            z.strictObject({
              ...sharedValidators,
              type: z.literal("character"),
              characterIds: z.array(isRRID<RRCharacterID>()),
            }),
            z.strictObject({
              ...sharedValidators,
              type: z.literal("lairAction"),
              description: z.string(),
            }),
          ]
        )
      )
    ),
    currentEntryId: z.nullable(isRRID<RRInitiativeTrackerEntryID>()),
  }),
  players: isEntityCollection(
    z.strictObject({
      id: isRRID<RRPlayerID>(),
      name: z.string(),
      color: isColor,
      isGM: z.boolean(),
      currentMap: z.nullable(isRRID<RRMapID>()),
      characterIds: z.array(isRRID<RRCharacterID>()),
      mainCharacterId: z.nullable(isRRID<RRCharacterID>()),
      favoriteAssetIds: z.array(isRRID<RRAssetID>()),
      hasHeroPoint: z.boolean(),
    })
  ),
  characters: isEntityCollection(
    z.strictObject({
      id: isRRID<RRCharacterID>(),
      name: z.string(),
      isTemplate: z.boolean(),

      tokenImageAssetId: isRRID<RRAssetID>(),
      tokenBorderColor: isColor,
      scale: z.number().min(0),

      auras: z.array(
        z.strictObject({
          size: z.number().int().min(0),
          color: isColor,
          shape: z.enum(["circle", "square"] as const),
          visibility: z.enum([
            "playerOnly",
            "playerAndGM",
            "everyone",
          ] as const),
          visibleWhen: z.enum(["always", "onTurn", "hover"] as const),
        })
      ),
      limitedUseSkills: z.array(
        z.strictObject({
          maxUseCount: z.number().int().min(0),
          currentUseCount: z.number().int().min(0),
          restoresAt: z.enum(["shortRest", "longRest"] as const),
          name: z.string(),
        })
      ),
      spells: z.array(
        z.strictObject({
          id: isRRID<RRCharacterSpellID>(),
          name: z.string(),
          level: z.number().int().min(0).max(9),
          prepared: z.boolean(),
          isRitual: z.boolean(),
          alwaysPrepared: z.boolean(),
          concentrationRounds: z.number().int().min(0),
        })
      ),
      hp: z.number().int(),
      temporaryHP: z.number().int().min(0),
      maxHP: z.number().int().min(0),
      // Like from the Hero's Feast, which increases your hit point maximum.
      // Can also be used to decrease the hit point maximum temporarily.
      maxHPAdjustment: z.number().int(),

      ac: z.nullable(z.number().int().min(0)),
      spellSaveDC: z.nullable(z.number().int().min(0)),

      attributes: z.strictObject({
        initiative: z.number().int().nullable(),
        proficiency: z.number().int().nullable(),
        level: z.number().int().nullable(),
      }),
      stats: z.strictObject({
        STR: z.number().int().nullable(),
        DEX: z.number().int().nullable(),
        CON: z.number().int().nullable(),
        INT: z.number().int().nullable(),
        WIS: z.number().int().nullable(),
        CHA: z.number().int().nullable(),
      }),
      conditions: z.array(z.enum(conditionNames)),
      currentlyConcentratingOn: z.nullable(
        z.strictObject({
          name: z.string(),
          roundsLeft: z.number().int().min(0),
        })
      ),
      skills: z.strictObject({
        Athletics: isProficiencyValue.nullable(),
        Acrobatics: isProficiencyValue.nullable(),
        "Sleight of Hand": isProficiencyValue.nullable(),
        Stealth: isProficiencyValue.nullable(),
        Arcana: isProficiencyValue.nullable(),
        History: isProficiencyValue.nullable(),
        Investigation: isProficiencyValue.nullable(),
        Nature: isProficiencyValue.nullable(),
        Religion: isProficiencyValue.nullable(),
        "Animal Handling": isProficiencyValue.nullable(),
        Insight: isProficiencyValue.nullable(),
        Medicine: isProficiencyValue.nullable(),
        Perception: isProficiencyValue.nullable(),
        Survival: isProficiencyValue.nullable(),
        Deception: isProficiencyValue.nullable(),
        Intimidation: isProficiencyValue.nullable(),
        Performance: isProficiencyValue.nullable(),
        Persuasion: isProficiencyValue.nullable(),
      }),
      savingThrows: z.strictObject({
        STR: isProficiencyValue.nullable(),
        DEX: isProficiencyValue.nullable(),
        CON: isProficiencyValue.nullable(),
        INT: isProficiencyValue.nullable(),
        WIS: isProficiencyValue.nullable(),
        CHA: isProficiencyValue.nullable(),
      }),
      visibility: z.enum(["gmOnly", "everyone"] as const),
      localToMap: z.nullable(isRRID<RRMapID>()),
      diceTemplateCategories: z.array(isDiceTemplateCategory),
      dice: z.array(isDie),
      notes: z.string(),
    })
  ),
  maps: isEntityCollection(
    z.strictObject({
      id: isRRID<RRMapID>(),

      objects: isEntityCollection(
        z.union([
          z.strictObject({
            ...mapObjectBaseSharedValidators,
            type: z.literal("token"),
            characterId: isRRID<RRCharacterID>(),
          }),
          z.strictObject({
            ...mapObjectDrawingSharedValidators,
            type: z.literal("mapLink"),
            mapId: isRRID<RRMapID>(),
          }),
          z.strictObject({
            ...mapObjectDrawingSharedValidators,
            type: z.literal("image"),
            imageAssetId: isRRID<RRAssetID>(),
            height: z.number().int().min(0),
          }),
          z.strictObject({
            ...mapObjectDrawingSharedValidators,
            type: z.literal("rectangle"),
            size: isRRPoint,
          }),
          z.strictObject({
            ...mapObjectDrawingSharedValidators,
            type: z.literal("ellipse"),
            size: isRRPoint,
          }),
          z.strictObject({
            ...mapObjectDrawingSharedValidators,
            type: z.literal("polygon"),
            points: z.array(isRRPoint),
          }),
          z.strictObject({
            ...mapObjectDrawingSharedValidators,
            type: z.literal("freehand"),
            points: z.array(isRRPoint),
          }),
          z.strictObject({
            ...mapObjectDrawingSharedValidators,
            type: z.literal("text"),
            text: z.string(),
          }),
        ])
      ),

      settings: z.strictObject({
        atmosphere: z.strictObject({
          type: z.enum([
            "none",
            "rain",
            "snow",
            "fire",
            "fog",
            "thunderstorm",
            "dungeon",
          ] as const),
          intensity: z.number().min(0).max(1),
        }),
        name: z.string(),
        backgroundColor: isColor,
        gridEnabled: z.boolean(),
        gridColor: isColor,
        revealedAreas: z.nullable(
          z.array(z.array(z.strictObject({ X: z.number(), Y: z.number() })))
        ),

        gmWorldPosition: isRRPoint,
      }),
    })
  ),
  privateChats: isEntityCollection(
    z.strictObject({
      id: isRRID<RRPrivateChatID>(),
      idA: isRRID<RRPlayerID>(),
      idB: isRRID<RRPlayerID>(),
      messages: isEntityCollection(
        z.strictObject({
          id: isRRID<RRPrivateChatMessageID>(),
          direction: z.enum(["a2b", "b2a"] as const),
          text: z.string(),
          read: z.boolean(),
          timestamp: isTimestamp,
        })
      ),
    })
  ),
  logEntries: isEntityCollection(
    z.union(
      withDo(
        {
          id: isRRID<RRLogEntryID>(),
          silent: z.boolean(),
          playerId: z.nullable(isRRID<RRPlayerID>()),
          timestamp: isTimestamp,
        },
        (sharedValidators) => [
          z.strictObject({
            ...sharedValidators,
            type: z.literal("message"),
            payload: z.strictObject({
              text: z.string(),
            }),
          }),
          z.strictObject({
            ...sharedValidators,
            type: z.literal("achievement"),
            payload: z.strictObject({
              achievementId: z.number().int().min(0),
            }),
          }),
          z.strictObject({
            ...sharedValidators,
            type: z.literal("diceRoll"),
            payload: z.strictObject({
              tooltip: z.nullable(z.string()),
              rollType: isRollType,
              rollName: z.nullable(z.string()),
              diceRollTree: isDiceRollTree(true),
              characterIds: z.nullable(z.array(isRRID<RRCharacterID>())),
            }),
          }),
        ]
      )
    )
  ),
  assets: isEntityCollection(isRRAsset),
  soundSets: isEntityCollection(
    z.strictObject({
      id: isRRID<RRSoundSetID>(),
      name: z.string(),
      description: z.nullable(z.string()),
      playerId: isRRID<RRPlayerID>(),
      // A sound set has an array of playlists. Each playlist is an array of
      // songs, each with separately controllable volume. All playlists are
      // played in parallel and loop individually. Songs of a playlist are
      // played in order.
      playlists: z.array(
        z.strictObject({
          id: isRRID<RRPlaylistID>(),
          volume: isVolume,
          entries: z.array(
            withDo(
              {
                id: isRRID<RRPlaylistEntryID>(),
              },
              (sharedValidators) =>
                z.union([
                  z.strictObject({
                    ...sharedValidators,
                    type: z.literal("song"),
                    songId: isRRID<RRAssetID>(),
                    volume: isVolume,
                  }),
                  z.strictObject({
                    ...sharedValidators,
                    type: z.literal("silence"),
                    duration: z.number().min(1),
                  }),
                ])
            )
          ),
        })
      ),
    })
  ),
  ephemeral: z.strictObject({
    players: isEntityCollection(
      z.strictObject({
        id: isRRID<RRPlayerID>(),
        isOnline: z.boolean(),
        mapMouse: z.nullable(
          z.strictObject({
            position: isRRPoint,
            positionHistory: z.array(isRRPoint),
            lastUpdate: isTimestamp,
          })
        ),
        measurePath: z.array(isRRPoint),
      })
    ),
    activeMusic: isEntityCollection(
      withDo(
        {
          id: isRRID<RRActiveMusicID>(),
          startedAt: isTimestamp,
          volume: isVolume,
          addedBy: isRRID<RRPlayerID>(),
        },
        (sharedActiveMusicValidators) =>
          z.union([
            z.strictObject({
              ...sharedActiveMusicValidators,
              type: z.literal("song"),
              songId: isRRID<RRAssetID>(),
            }),
            z.strictObject({
              ...sharedActiveMusicValidators,
              type: z.literal("soundSet"),
              soundSetId: isRRID<RRSoundSetID>(),
            }),
          ])
      )
    ),
  }),
});

type SchemaType = z.infer<typeof isSyncedState>;

// Make sure that the schema really matches the type.
assert<IsExact<SchemaType, SyncedState>>(true);
