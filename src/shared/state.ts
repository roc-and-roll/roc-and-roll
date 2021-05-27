import * as t from "typanion";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { Dispatch } from "redux";
import type { IterableElement, Opaque } from "type-fest";
import { assertNever, rrid } from "./util";
import { isDamageType, isSyncedState } from "./validation";
import { LAST_MIGRATION_VERSION } from "./constants";

export type RRID = Opaque<string>;

export type RRPlayerID = Opaque<string, "player">;

export type RRCharacterID = Opaque<string, "character">;

export type RRMapID = Opaque<string, "map">;

export type RRMapObjectID = Opaque<string, "mapObject">;

export type RRPrivateChatID = Opaque<string, "privateChat">;

export type RRPrivateChatMessageID = Opaque<string, "privateChatMessage">;

export type RRLogEntryID = Opaque<string, "logEntry">;

export type RRInitiativeTrackerEntryID = Opaque<string, "initiativeEntry">;

// not used as part of the state, but as part of optimistic update handling
export type OptimisticUpdateID = Opaque<string, "optimisticUpdate">;

export type RRColor = string;

export type RRTimestamp = number;

export type RRPoint = { readonly x: number; readonly y: number };

export type RRCapPoint = { readonly X: number; readonly Y: number };

export type RRDiceTemplateID = Opaque<string, "diceTemplate">;

export type RRDiceTemplatePartID = Opaque<string, "diceTemplatePart">;

export type RRActiveSongID = Opaque<string, "activeSong">;

export type RRAssetID = Opaque<string, "asset">;

export type RRFile = {
  originalFilename: string;
  filename: string;
};

export type RRAura = IterableElement<
  SyncedState["characters"]["__trait"]["auras"]
>;

export const conditionNames = [
  "blinded",
  "charmed",
  "deafened",
  "exhaustion",
  "frightened",
  "grappled",
  "incapacitated",
  "invisible",
  "paralysed",
  "petrified",
  "poisoned",
  "prone",
  "restrained",
  "stunned",
  "unconscious",
  "hasted",
  "polymorphed",
  "hunters mark",
  "slowed",
  "cursed",
  "concealed",
  "disarmed",
  "half-cover",
  "hidden",
  "raging",
  "surprised",
  "three-quarters-cover",
  "total-cover",
] as const;

export type RRCharacterCondition = IterableElement<typeof conditionNames>;

export type RRInitiativeTrackerEntryCharacter = Extract<
  SyncedState["initiativeTracker"]["entries"]["__trait"],
  { type: "character" }
>;

export type RRInitiativeTrackerEntryLairAction = Extract<
  SyncedState["initiativeTracker"]["entries"]["__trait"],
  { type: "lairAction" }
>;

export type RRInitiativeTrackerEntry =
  SyncedState["initiativeTracker"]["entries"]["__trait"];

export type RRPlayer = SyncedState["players"]["__trait"];

export type RRObjectVisibility = "gmOnly" | "everyone";

export type RRCharacter = SyncedState["characters"]["__trait"];

export type RRToken = Extract<
  SyncedState["maps"]["__trait"]["objects"]["__trait"],
  { type: "token" }
>;

export type RRMapLink = Extract<
  SyncedState["maps"]["__trait"]["objects"]["__trait"],
  { type: "mapLink" }
>;

export type RRMapDrawingImage = Extract<
  SyncedState["maps"]["__trait"]["objects"]["__trait"],
  { type: "image" }
>;

export type RRMapDrawingRectangle = Extract<
  SyncedState["maps"]["__trait"]["objects"]["__trait"],
  { type: "rectangle" }
>;

export type RRMapDrawingEllipse = Extract<
  SyncedState["maps"]["__trait"]["objects"]["__trait"],
  { type: "ellipse" }
>;

export type RRMapDrawingPolygon = Extract<
  SyncedState["maps"]["__trait"]["objects"]["__trait"],
  { type: "polygon" }
>;

export type RRMapDrawingFreehand = Extract<
  SyncedState["maps"]["__trait"]["objects"]["__trait"],
  { type: "freehand" }
>;

export type RRMapDrawingText = Extract<
  SyncedState["maps"]["__trait"]["objects"]["__trait"],
  { type: "text" }
>;

export type RRMapObject = SyncedState["maps"]["__trait"]["objects"]["__trait"];

export type RRMap = SyncedState["maps"]["__trait"];

export type RRPrivateChatMessage =
  SyncedState["privateChats"]["__trait"]["messages"]["__trait"];

export type RRPrivateChat = SyncedState["privateChats"]["__trait"];

export type RRLogEntryMessage = Extract<
  SyncedState["logEntries"]["__trait"],
  { type: "message" }
>;

export type RRLogEntryAchievement = Extract<
  SyncedState["logEntries"]["__trait"],
  { type: "achievement" }
>;

export type RRDiceTemplate = SyncedState["diceTemplates"]["__trait"];

export const linkedModifierNames = [
  "STR",
  "DEX",
  "CON",
  "INT",
  "WIS",
  "CHA",
  "initiative",
  "proficiency",
] as const;

export type RRDiceTemplatePartTemplate = Extract<
  IterableElement<SyncedState["diceTemplates"]["__trait"]["parts"]>,
  {
    type: "template";
  }
>;

export type RRDiceTemplatePartModifier = Extract<
  IterableElement<SyncedState["diceTemplates"]["__trait"]["parts"]>,
  {
    type: "modifier";
  }
>;

export type RRDiceTemplatePartLinkedModifier = Extract<
  IterableElement<SyncedState["diceTemplates"]["__trait"]["parts"]>,
  {
    type: "linkedModifier";
  }
>;

export type RRDiceTemplatePartDice = Extract<
  IterableElement<SyncedState["diceTemplates"]["__trait"]["parts"]>,
  {
    type: "dice";
  }
>;

export type RRDiceTemplatePartWithDamage = Extract<
  IterableElement<SyncedState["diceTemplates"]["__trait"]["parts"]>,
  {
    damage: RRDamageType;
  }
>;

export type RRDiceTemplatePart = IterableElement<
  SyncedState["diceTemplates"]["__trait"]["parts"]
>;

export const damageTypes = [
  null,
  "slashing",
  "piercing",
  "bludgeoning",
  "poison",
  "acid",
  "fire",
  "cold",
  "radiant",
  "necrotic",
  "lightning",
  "thunder",
  "force",
  "psychic",
] as const;

export const colorForDamageType = (type: RRDamageType["type"]) => {
  switch (type) {
    case null:
      return "#ffffff";
    case "piercing":
      return "#cccccc";
    case "slashing":
      return "#969696";
    case "bludgeoning":
      return "#5e5e5e";
    case "poison":
      return "#046e24";
    case "acid":
      return "#7bed00";
    case "fire":
      return "#c43a04";
    case "cold":
      return "#cbeff2";
    case "radiant":
      return "#fcfbae";
    case "necrotic":
      return "#303005";
    case "lightning":
      return "#ffff00";
    case "thunder":
      return "#597dff";
    case "force":
      return "#ebb0f7";
    case "psychic":
      return "#ff4ade";
    default:
      assertNever(type);
  }
};

export const damageTypeModifiers = ["magical", "silver", "adamantine"] as const;

export type RRDamageType = t.InferType<typeof isDamageType>;

export const multipleRollValues = [
  "advantage",
  "disadvantage",
  "none",
] as const;

export type RRMultipleRoll = IterableElement<typeof multipleRollValues>;

export type RRDice = Extract<
  IterableElement<RRLogEntryDiceRoll["payload"]["dice"]>,
  { type: "dice" }
>;

export type RRModifier = Extract<
  IterableElement<RRLogEntryDiceRoll["payload"]["dice"]>,
  { type: "modifier" }
>;

export type RRLogEntryDiceRoll = Extract<
  SyncedState["logEntries"]["__trait"],
  { type: "diceRoll" }
>;

export type RRLogEntry = SyncedState["logEntries"]["__trait"];

export type RRSong = Extract<
  SyncedState["assets"]["__trait"],
  { type: "song" }
>;

export type RRImage = Extract<
  SyncedState["assets"]["__trait"],
  { type: "image" }
>;

export type RRAsset = RRSong | RRImage;

// This must resemble the EntityState type from @reduxjs/toolkit to work with
// createEntityAdapter
// https://redux-toolkit.js.org/api/createEntityAdapter
export interface EntityCollection<E extends { id: RRID }> {
  entities: Record<E["id"], E>;
  ids: E["id"][];
  // __trait is only needed for type checking. Otherwise, our checks to verify
  // that the schema matches the state always return true as soon as they
  // encounter an entity collection. This is because they get confused by our
  // opaque RRIDs as Record keys.
  //
  // assert<IsExact<SchemaType, SyncedState>>(true);
  __trait: E;
}

export function byId<E extends { id: RRID }>(
  entities: Record<E["id"], E>,
  id: E["id"]
): E | undefined {
  return entities[id];
}

export function setById<E extends { id: RRID }>(
  entities: Record<E["id"], E>,
  id: E["id"],
  value: E
): void {
  entities[id] = value;
}

export function entries<E extends { id: RRID }>(
  collection: EntityCollection<E>
): E[] {
  return collection.ids.map((id) => byId(collection.entities, id)!);
}

export function makeEntityCollection<E extends { id: RRID }>(
  collection: Omit<EntityCollection<E>, "__trait">
): EntityCollection<E> {
  return collection as EntityCollection<E>;
}

// useful if you want to make sure that the identity of the empty collection
// never changes.
export const EMPTY_ENTITY_COLLECTION = makeEntityCollection<never>({
  entities: {},
  ids: [],
});

export type InitiativeTrackerSyncedState = SyncedState["initiativeTracker"];

export type EphermalPlayer = SyncedState["ephermal"]["players"]["__trait"];

export type RRActiveSong = SyncedState["ephermal"]["activeSongs"]["__trait"];

export type EphermalSyncedState = SyncedState["ephermal"];

export type RRGlobalSettings = SyncedState["globalSettings"];

export type SyncedState = t.InferType<typeof isSyncedState>;

export const defaultMap: RRMap = {
  backgroundColor: "#000",
  objects: EMPTY_ENTITY_COLLECTION,
  gmWorldPosition: { x: 0, y: 0 },
  gridEnabled: true,
  gridColor: "#808080",
  name: "unnamed",
  revealedAreas: null,
  id: rrid<RRMap>(),
};

export const initialSyncedState: SyncedState = {
  version: LAST_MIGRATION_VERSION,
  globalSettings: {
    musicIsGMOnly: false,
  },
  initiativeTracker: {
    visible: false,
    currentEntryId: null,
    entries: EMPTY_ENTITY_COLLECTION,
  },
  players: EMPTY_ENTITY_COLLECTION,
  characters: EMPTY_ENTITY_COLLECTION,
  characterTemplates: EMPTY_ENTITY_COLLECTION,
  diceTemplates: EMPTY_ENTITY_COLLECTION,
  maps: makeEntityCollection({
    entities: { [defaultMap.id]: defaultMap },
    ids: [defaultMap.id],
  }),
  privateChats: EMPTY_ENTITY_COLLECTION,
  logEntries: EMPTY_ENTITY_COLLECTION,
  assets: EMPTY_ENTITY_COLLECTION,
  ephermal: {
    players: EMPTY_ENTITY_COLLECTION,
    activeSongs: EMPTY_ENTITY_COLLECTION,
  },
};

export type SyncedStateAction<P = void, T extends string = string, M = never> =
  PayloadAction<P, T, M, never> & {
    meta?: {
      __optimisticUpdateId__?: OptimisticUpdateID;
    };
  };

export type SyncedStateDispatch = Dispatch<SyncedStateAction>;
