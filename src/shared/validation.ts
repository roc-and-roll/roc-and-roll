import * as t from "typanion";
import { assert, IsExact } from "conditional-type-checks";
import {
  conditionNames,
  damageTypes,
  EntityCollection,
  characterAttributeNames,
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
  skillNames,
  proficiencyValues,
  categoryIcons,
  RRDiceTemplateCategoryID,
  RRDamageType,
} from "./state";
import { withDo } from "./util";
import tinycolor from "tinycolor2";
import { isBlurhashValid } from "blurhash";

export function isRRID<ID extends RRID>() {
  return t.makeValidator({
    test: (value, state): value is ID =>
      t.applyCascade(t.isString(), [t.hasExactLength(21)])(value, state),
  });
}

// @ts-expect-error This should be fine.
const isDictByRRID: <T extends t.StrictValidator<any, { id: RRID }>>(
  spec: T,
  {
    keys: keySpec,
  }: {
    keys: t.StrictValidator<unknown, RRID>;
  }
) => t.StrictValidator<unknown, Record<t.InferType<T>["id"], t.InferType<T>>> =
  t.isDict;

function isEntityCollection<V extends t.StrictValidator<any, { id: RRID }>>(
  entityValidator: V
): t.StrictValidator<unknown, EntityCollection<V["__trait"]>> {
  // @ts-expect-error This should be fine.
  return t.isObject({
    entities: isDictByRRID(entityValidator, {
      keys: isRRID<V["__trait"]["id"]>(),
    }),
    ids: t.applyCascade(t.isArray(isRRID<V["__trait"]["id"]>()), [
      t.hasUniqueItems(),
    ]),
  });
}

function isColor() {
  return t.applyCascade(t.isString(), [
    t.makeValidator({
      test: (value: string) => {
        return tinycolor(value).isValid();
      },
    }),
  ]);
}

const isBlurhash = <T extends string>() =>
  t.makeValidator<T>({
    test: (value, state) => {
      const result = isBlurhashValid(value);
      if (!result.result)
        return t.pushError(
          state,
          `Expected a valid blurhash. ${result.errorReason ?? ""}`
        );

      return true;
    },
  });

const isRRPoint = t.isObject({
  x: t.isNumber(),
  y: t.isNumber(),
});

const isTimestamp = t.applyCascade(t.isNumber(), [
  t.isInteger(),
  t.isPositive(),
]);

export const isDamageType = t.isObject({
  type: t.isEnum(damageTypes),
});

const sharedAssetValidators = {
  id: isRRID<RRAssetID>(),
  name: t.isString(),
  description: t.isNullable(t.isString()),
  tags: t.isArray(t.isString()),

  location: t.isOneOf(
    [
      t.isObject({
        type: t.isLiteral("external"),
        url: t.isString(),
      }),
      t.isObject({
        type: t.isLiteral("local"),
        filename: t.isString(),
        originalFilename: t.isString(),
        mimeType: t.isString(),
      }),
    ],
    { exclusive: true }
  ),

  playerId: t.isNullable(isRRID<RRPlayerID>()),
  extra: t.isObject({}, { extra: t.isUnknown() }),
};

const isRRAssetSong = t.isObject({
  ...sharedAssetValidators,
  type: t.isLiteral("song"),
  duration: t.applyCascade(t.isNumber(), [t.isAtLeast(1)]),
});

const isRRAssetImage = t.isObject({
  ...sharedAssetValidators,
  type: t.isLiteral("image"),
  width: t.applyCascade(t.isNumber(), [t.isInteger(), t.isPositive()]),
  height: t.applyCascade(t.isNumber(), [t.isInteger(), t.isPositive()]),
  blurhash: t.applyCascade(t.isString(), [isBlurhash()]),

  originalFunction: t.isEnum(["token", "map", "unknown"] as const),
});

const isRRAssetOther = t.isObject({
  ...sharedAssetValidators,
  type: t.isLiteral("other"),
});

const isRRAsset = t.isOneOf([isRRAssetSong, isRRAssetImage, isRRAssetOther], {
  exclusive: true,
});

const isVolume = t.applyCascade(t.isNumber(), [t.isInInclusiveRange(0, 1)]);

export const isStateVersion = t.applyCascade(t.isNumber(), [
  t.isInteger(),
  t.isPositive(),
]);

const rollType = ["initiative", "hit", "attack", null] as const;

interface _RRDiceTemplate {
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
        name: "initiative";
      }
    | {
        id: RRDiceTemplatePartID;
        type: "linkedProficiency";
        damage: RRDamageType;
        proficiency: typeof proficiencyValues[number];
      }
    | {
        id: RRDiceTemplatePartID;
        type: "linkedStat";
        name: typeof characterStatNames[number];
        damage: RRDamageType;
      }
  )[];
  rollType: typeof rollType[number];
}

const __isDiceTemplateRecursive = t.makeValidator({
  test: (value, state): value is _RRDiceTemplate =>
    isDiceTemplate(value, state),
});

const isDiceTemplate = t.isObject({
  id: isRRID<RRDiceTemplateID>(),
  name: t.isString(),
  notes: t.isString(),
  parts: t.applyCascade(
    t.isArray(
      t.isOneOf(
        withDo({ id: isRRID<RRDiceTemplatePartID>() }, (sharedValidators) => [
          t.isObject({
            ...sharedValidators,
            type: t.isLiteral("dice"),
            count: t.applyCascade(t.isNumber(), [
              t.isInteger(),
              t.isPositive(),
            ]),
            faces: t.applyCascade(t.isNumber(), [
              t.isInteger(),
              t.isPositive(),
            ]),
            negated: t.isBoolean(),
            damage: isDamageType,
            modified: t.isEnum(multipleRollValues),
          }),
          t.isObject({
            ...sharedValidators,
            type: t.isLiteral("template"),
            template: __isDiceTemplateRecursive,
          }),
          t.isObject({
            ...sharedValidators,
            type: t.isLiteral("modifier"),
            number: t.applyCascade(t.isNumber(), [t.isInteger()]),
            damage: isDamageType,
          }),
          t.isObject({
            ...sharedValidators,
            type: t.isLiteral("linkedModifier"),
            name: t.isLiteral("initiative"),
            damage: isDamageType,
          }),
          t.isObject({
            ...sharedValidators,
            type: t.isLiteral("linkedProficiency"),
            damage: isDamageType,
            proficiency: t.isEnum(proficiencyValues),
          }),
          t.isObject({
            ...sharedValidators,
            type: t.isLiteral("linkedStat"),
            name: t.isEnum(characterStatNames),
            damage: isDamageType,
          }),
        ])
      )
    ),
    [t.hasUniqueItems({ map: (part) => part.id })]
  ),
  rollType: t.isEnum(rollType),
});

export type RRDiceTemplate = t.InferType<typeof isDiceTemplate>;

assert<IsExact<RRDiceTemplate, _RRDiceTemplate>>(true);

const isDiceTemplateCategory = t.isObject({
  id: isRRID<RRDiceTemplateCategoryID>(),
  icon: t.isEnum(categoryIcons),
  categoryName: t.isString(),
  templates: t.isArray(isDiceTemplate),
});
export type RRDiceTemplateCategory = t.InferType<typeof isDiceTemplateCategory>;

export const isSyncedState = t.isObject({
  version: isStateVersion,
  globalSettings: t.isObject({
    musicIsGMOnly: t.isBoolean(),
  }),
  initiativeTracker: t.isObject({
    visible: t.isBoolean(),
    entries: isEntityCollection(
      t.isOneOf(
        withDo(
          {
            id: isRRID<RRInitiativeTrackerEntryID>(),
            initiative: t.applyCascade(t.isNumber(), [
              t.isInteger(),
              t.isPositive(),
            ]),
          },
          (sharedValidators) => [
            t.isObject({
              ...sharedValidators,
              type: t.isLiteral("character"),
              characterIds: t.isArray(isRRID<RRCharacterID>()),
            }),
            t.isObject({
              ...sharedValidators,
              type: t.isLiteral("lairAction"),
              description: t.isString(),
            }),
          ]
        ),
        { exclusive: true }
      )
    ),
    currentEntryId: t.isNullable(isRRID<RRInitiativeTrackerEntryID>()),
  }),
  players: isEntityCollection(
    t.isObject({
      id: isRRID<RRPlayerID>(),
      name: t.isString(),
      color: isColor(),
      isGM: t.isBoolean(),
      currentMap: isRRID<RRMapID>(),
      characterIds: t.isArray(isRRID<RRCharacterID>()),
      mainCharacterId: t.isNullable(isRRID<RRCharacterID>()),
      favoritedAssetIds: t.isArray(isRRID<RRAssetID>()),
      diceTemplateCategories: t.isArray(isDiceTemplateCategory),
    })
  ),
  ...withDo(
    () =>
      isEntityCollection(
        t.isObject({
          id: isRRID<RRCharacterID>(),
          name: t.isString(),

          tokenImageAssetId: isRRID<RRAssetID>(),
          tokenBorderColor: isColor(),
          scale: t.applyCascade(t.isNumber(), [t.isAtLeast(1)]),

          auras: t.isArray(
            t.isObject({
              size: t.applyCascade(t.isNumber(), [
                t.isInteger(),
                t.isPositive(),
              ]),
              color: isColor(),
              shape: t.isEnum(["circle", "square"] as const),
              visibility: t.isEnum([
                "playerOnly",
                "playerAndGM",
                "everyone",
              ] as const),
              visibileWhen: t.isEnum(["always", "onTurn", "hover"] as const),
            })
          ),
          hp: t.applyCascade(t.isNumber(), [t.isInteger()]),
          temporaryHP: t.applyCascade(t.isNumber(), [
            t.isInteger(),
            t.isPositive(),
          ]),
          maxHP: t.applyCascade(t.isNumber(), [t.isInteger(), t.isPositive()]),
          // Like from the Hero's Feast, which increases your hit point maximum.
          // Can also be used to decrease the hit point maximum temporarily.
          maxHPAdjustment: t.applyCascade(t.isNumber(), [t.isInteger()]),
          attributes: t.isDict(
            t.isNullable(t.applyCascade(t.isNumber(), [t.isInteger()])),
            { keys: t.isEnum(characterAttributeNames) }
          ),
          stats: t.isDict(
            t.isNullable(t.applyCascade(t.isNumber(), [t.isInteger()])),
            { keys: t.isEnum(characterStatNames) }
          ),
          conditions: t.isArray(t.isEnum(conditionNames)),
          skills: t.isDict(t.isEnum(proficiencyValues), {
            keys: t.isEnum(skillNames),
          }),
          savingThrows: t.isDict(t.isEnum(proficiencyValues), {
            keys: t.isEnum(characterStatNames),
          }),

          visibility: t.isEnum(["gmOnly", "everyone"] as const),
          localToMap: t.isNullable(isRRID<RRMapID>()),
        })
      ),
    (makeValidator) => ({
      characters: makeValidator(),
      characterTemplates: makeValidator(),
    })
  ),
  maps: isEntityCollection(
    t.isObject({
      id: isRRID<RRMapID>(),

      objects: isEntityCollection(
        withDo(
          // RRMapObjectBase
          {
            id: isRRID<RRMapObjectID>(),
            position: isRRPoint,
            rotation: t.isNumber(),
            playerId: isRRID<RRPlayerID>(),
            visibility: t.isEnum(["gmOnly", "everyone"] as const),
          },
          (sharedValidators) =>
            t.isOneOf([
              t.isObject({
                ...withDo(sharedValidators, ({ visibility, ...v }) => v),
                type: t.isLiteral("token"),
                characterId: isRRID<RRCharacterID>(),
              }),
              t.isObject({
                ...sharedValidators,
                type: t.isLiteral("mapLink"),
                locked: t.isBoolean(),
                mapId: isRRID<RRMapID>(),
                color: isColor(),
              }),
              ...withDo(
                // RRMapDrawingBase
                {
                  ...sharedValidators,
                  locked: t.isBoolean(),
                  color: isColor(),
                },
                (sharedValidators) => [
                  t.isObject({
                    ...sharedValidators,
                    type: t.isLiteral("image"),
                    imageAssetId: isRRID<RRAssetID>(),
                    height: t.applyCascade(t.isNumber(), [
                      t.isInteger(),
                      t.isPositive(),
                    ]),
                  }),
                  t.isObject({
                    ...sharedValidators,
                    type: t.isLiteral("rectangle"),
                    size: isRRPoint,
                  }),
                  t.isObject({
                    ...sharedValidators,
                    type: t.isLiteral("ellipse"),
                    size: isRRPoint,
                  }),
                  t.isObject({
                    ...sharedValidators,
                    type: t.isLiteral("polygon"),
                    points: t.isArray(isRRPoint),
                  }),
                  t.isObject({
                    ...sharedValidators,
                    type: t.isLiteral("freehand"),
                    points: t.isArray(isRRPoint),
                  }),
                  t.isObject({
                    ...sharedValidators,
                    type: t.isLiteral("text"),
                    text: t.isString(),
                  }),
                ]
              ),
            ])
        )
      ),

      settings: t.isObject({
        name: t.isString(),
        backgroundColor: isColor(),
        gridEnabled: t.isBoolean(),
        gridColor: isColor(),
        revealedAreas: t.isNullable(
          t.isArray(t.isArray(t.isObject({ X: t.isNumber(), Y: t.isNumber() })))
        ),

        gmWorldPosition: isRRPoint,
      }),
    })
  ),
  privateChats: isEntityCollection(
    t.isObject({
      id: isRRID<RRPrivateChatID>(),
      idA: isRRID<RRPlayerID>(),
      idB: isRRID<RRPlayerID>(),
      messages: isEntityCollection(
        t.isObject({
          id: isRRID<RRPrivateChatMessageID>(),
          direction: t.isEnum(["a2b", "b2a"] as const),
          text: t.isString(),
          read: t.isBoolean(),
          timestamp: isTimestamp,
        })
      ),
    })
  ),
  logEntries: isEntityCollection(
    t.isOneOf(
      withDo(
        {
          id: isRRID<RRLogEntryID>(),
          silent: t.isBoolean(),
          playerId: t.isNullable(isRRID<RRPlayerID>()),
          timestamp: isTimestamp,
        },
        (sharedValidators) => [
          t.isObject({
            ...sharedValidators,
            type: t.isLiteral("message"),
            payload: t.isObject({
              text: t.isString(),
            }),
          }),
          t.isObject({
            ...sharedValidators,
            type: t.isLiteral("achievement"),
            payload: t.isObject({
              achievementId: t.applyCascade(t.isNumber(), [
                t.isInteger(),
                t.isPositive(),
              ]),
            }),
          }),
          t.isObject({
            ...sharedValidators,
            type: t.isLiteral("diceRoll"),
            payload: t.isObject({
              rollType: t.isEnum([
                "initiative",
                "hit",
                "attack",
                null,
              ] as const),
              rollName: t.isNullable(t.isString()),
              dice: t.isArray(
                t.isOneOf(
                  withDo({ damageType: isDamageType }, (sharedValidators) => [
                    t.isObject({
                      ...sharedValidators,
                      type: t.isLiteral("modifier"),
                      modifier: t.applyCascade(t.isNumber(), [t.isInteger()]),
                    }),
                    t.isObject({
                      ...sharedValidators,
                      type: t.isLiteral("dice"),
                      faces: t.applyCascade(t.isNumber(), [
                        t.isInteger(),
                        t.isPositive(),
                      ]),
                      modified: t.isEnum(multipleRollValues),
                      diceResults: t.isArray(t.isNumber()),
                      negated: t.isBoolean(),
                    }),
                  ]),
                  { exclusive: true }
                )
              ),
            }),
          }),
        ]
      ),
      { exclusive: true }
    )
  ),
  assets: isEntityCollection(isRRAsset),
  soundSets: isEntityCollection(
    t.isObject({
      id: isRRID<RRSoundSetID>(),
      name: t.isString(),
      description: t.isNullable(t.isString()),
      playerId: isRRID<RRPlayerID>(),
      // A sound set has an array of playlists. Each playlist is an array of
      // songs, each with separately controllable volume. All playlists are
      // played in parallel and loop individually. Songs of a playlist are
      // played in order.
      playlists: t.isArray(
        t.isObject({
          id: isRRID<RRPlaylistID>(),
          volume: isVolume,
          entries: t.isArray(
            withDo(
              {
                id: isRRID<RRPlaylistEntryID>(),
              },
              (sharedValidators) =>
                t.isOneOf([
                  t.isObject({
                    ...sharedValidators,
                    type: t.isLiteral("song"),
                    songId: isRRID<RRAssetID>(),
                    volume: isVolume,
                  }),
                  t.isObject({
                    ...sharedValidators,
                    type: t.isLiteral("silence"),
                    duration: t.applyCascade(t.isNumber(), [t.isAtLeast(1)]),
                  }),
                ])
            )
          ),
        })
      ),
    })
  ),
  ephemeral: t.isObject({
    players: isEntityCollection(
      t.isObject({
        id: isRRID<RRPlayerID>(),
        isOnline: t.isBoolean(),
        mapMouse: t.isNullable(
          t.isObject({
            position: isRRPoint,
            positionHistory: t.isArray(isRRPoint),
            lastUpdate: isTimestamp,
          })
        ),
        measurePath: t.isArray(isRRPoint),
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
          t.isOneOf([
            t.isObject({
              ...sharedActiveMusicValidators,
              type: t.isLiteral("song"),
              songId: isRRID<RRAssetID>(),
            }),
            t.isObject({
              ...sharedActiveMusicValidators,
              type: t.isLiteral("soundSet"),
              soundSetId: isRRID<RRSoundSetID>(),
            }),
          ])
      )
    ),
  }),
});

type SchemaType = t.InferType<typeof isSyncedState>;

// Make sure that the schema really matches the type.
assert<IsExact<SchemaType, SyncedState>>(true);
