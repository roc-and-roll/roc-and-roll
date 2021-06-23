import * as t from "typanion";
import { assert, IsExact } from "conditional-type-checks";
import {
  conditionNames,
  damageTypeModifiers,
  damageTypes,
  EntityCollection,
  linkedModifierNames,
  multipleRollValues,
  RRActiveSongID,
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
} from "./state";
import { withDo } from "./util";
import tinycolor from "tinycolor2";

export function isRRID<ID extends RRID>(testLength: boolean = true) {
  return t.makeValidator({
    test: (value, state): value is ID =>
      t.applyCascade(t.isString(), testLength ? [t.hasExactLength(21)] : [])(
        value,
        state
      ),
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

function isEntityCollection<
  O extends { id: RRID },
  V extends t.StrictValidator<any, O>
>(
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

function _isColor() {
  return t.makeValidator({
    test: (value: string, state) => {
      return tinycolor(value).isValid();
    },
  });
}

function isColor() {
  return t.applyCascade(t.isString(), [_isColor()]);
}

const isRRFile = t.isObject({
  originalFilename: t.isString(),
  filename: t.isString(),
});

const isRRPoint = t.isObject({
  x: t.isNumber(),
  y: t.isNumber(),
});

const isTimestamp = t.applyCascade(t.isNumber(), [
  t.isInteger(),
  t.isPositive(),
]);

const isReadonlyArray = <S extends t.StrictValidator<unknown, unknown>>(
  schema: S
): t.StrictValidator<unknown, ReadonlyArray<t.InferType<S>>> =>
  t.isArray(schema);

export const isDamageType = t.isObject({
  type: t.isEnum(damageTypes),
  modifiers: isReadonlyArray(t.isEnum(damageTypeModifiers)),
});

const sharedAssetValidators = {
  id: isRRID<RRAssetID>(false),
  name: t.isString(),
  external: t.isBoolean(),
  filenameOrUrl: t.isString(),
  playerId: isRRID<RRPlayerID>(),
};

const isRRSong = t.isObject({
  ...sharedAssetValidators,
  type: t.isLiteral("song"),
  tags: t.isArray(t.isString()),
  durationSeconds: t.applyCascade(t.isNumber(), [
    t.isInteger(),
    t.isPositive(),
  ]),
});

export const isStateVersion = t.applyCascade(t.isNumber(), [
  t.isInteger(),
  t.isPositive(),
]);

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
      favoritedAssetIds: t.isArray(isRRID<RRAssetID>(false)),
    })
  ),
  ...withDo(
    () =>
      isEntityCollection(
        t.isObject({
          id: isRRID<RRCharacterID>(),
          name: t.isString(),

          tokenImage: t.isNullable(isRRFile),
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
          maxHP: t.applyCascade(t.isNumber(), [t.isInteger(), t.isPositive()]),
          attributes: t.isDict(
            // TODO: This should have explicit keys
            t.isNullable(t.applyCascade(t.isNumber(), [t.isInteger()])),
            { keys: t.isString() }
          ),
          conditions: t.isArray(t.isEnum(conditionNames)),

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
                    image: isRRFile,
                    originalSize: isRRPoint,
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
  diceTemplates: isEntityCollection(
    t.isObject({
      id: isRRID<RRDiceTemplateID>(),
      playerId: isRRID<RRPlayerID>(),
      name: t.isString(),
      notes: t.isString(),
      parts: t.applyCascade(
        t.isArray(
          t.isOneOf(
            withDo(
              { id: isRRID<RRDiceTemplatePartID>() },
              (sharedValidators) => [
                t.isObject({
                  ...sharedValidators,
                  type: t.isLiteral("template"),
                  templateId: isRRID<RRDiceTemplateID>(),
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
                  name: t.isEnum(linkedModifierNames),
                  damage: isDamageType,
                }),
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
              ]
            )
          )
        ),
        [t.hasUniqueItems({ map: (part) => part.id })]
      ),
      rollType: t.isEnum(["initiative", "hit", "attack", null] as const),
    })
  ),
  assets: isEntityCollection(
    t.isOneOf(
      [
        isRRSong,
        t.isObject({
          ...sharedAssetValidators,
          type: t.isLiteral("image"),
          originalFunction: t.isEnum(["token", "map"] as const),
        }),
      ],
      { exclusive: true }
    )
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
    activeSongs: isEntityCollection(
      t.isObject({
        id: isRRID<RRActiveSongID>(false),
        song: isRRSong,
        startedAt: isTimestamp,
        volume: t.applyCascade(t.isNumber(), [t.isInInclusiveRange(0, 1)]),
        addedBy: isRRID<RRPlayerID>(),
      })
    ),
  }),
});

type SchemaType = t.InferType<typeof isSyncedState>;

// Make sure that the schema really matches the TextEntry type.
assert<IsExact<SchemaType, SyncedState>>(true);
// {
//   const c: SchemaType["diceTemplates"]["__trait"] = (null as unknown) as RRDiceTemplate;
//   const cc: RRDiceTemplate = (null as unknown) as SchemaType["diceTemplates"]["__trait"];
// }
