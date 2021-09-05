import * as t from "typanion";
import type { Dispatch } from "redux";
import type { IterableElement, ValueOf } from "type-fest";
import { assertNever, rrid } from "./util";
import { isDamageType, isSyncedState } from "./validation";
import { LAST_MIGRATION_VERSION } from "./constants";

export type MakeRRID<K extends string> = `RRID/${K}/${string}`;

export type RRID = MakeRRID<string>;

export type RRPlayerID = MakeRRID<"player">;

export type RRCharacterID = MakeRRID<"character">;

export type RRMapID = MakeRRID<"map">;

export type RRMapObjectID = MakeRRID<"mapObject">;

export type RRPrivateChatID = MakeRRID<"privateChat">;

export type RRPrivateChatMessageID = MakeRRID<"privateChatMessage">;

export type RRLogEntryID = MakeRRID<"logEntry">;

export type RRInitiativeTrackerEntryID = MakeRRID<"initiativeEntry">;

// not used as part of the state, but as part of optimistic update handling
export type OptimisticUpdateID = MakeRRID<"optimisticUpdate">;

export type RRColor = string;

export type RRTimestamp = number;

export type RRPoint = { readonly x: number; readonly y: number };

export type RRCapPoint = { readonly X: number; readonly Y: number };

export type RRDiceTemplateID = MakeRRID<"diceTemplate">;

export type RRDiceTemplatePartID = MakeRRID<"diceTemplatePart">;

export type RRActiveSongID = MakeRRID<"activeSong">;

export type RRAssetID = MakeRRID<"asset">;

export type RRFile = {
  originalFilename: string;
  filename: string;
};

// Extracts the entity type from an entity collection
type ECE<E extends EntityCollection<{ id: RRID }>> = ValueOf<E["entities"]>;

export type RRAura = IterableElement<ECE<SyncedState["characters"]>["auras"]>;

export const conditionNames = [
  "blinded",
  "charmed",
  "deafened",
  "exhaustion",
  "frightened",
  "grappled",
  "incapacitated",
  "invisible",
  "paralyzed",
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
  "dead",
] as const;

export type RRCharacterCondition = IterableElement<typeof conditionNames>;

export type RRInitiativeTrackerEntryCharacter = Extract<
  ECE<SyncedState["initiativeTracker"]["entries"]>,
  { type: "character" }
>;

export type RRInitiativeTrackerEntryLairAction = Extract<
  ECE<SyncedState["initiativeTracker"]["entries"]>,
  { type: "lairAction" }
>;

export type RRInitiativeTrackerEntry = ECE<
  SyncedState["initiativeTracker"]["entries"]
>;

export type RRPlayer = ECE<SyncedState["players"]>;

export type RRObjectVisibility = "gmOnly" | "everyone";

export type RRCharacter = ECE<SyncedState["characters"]>;

export type RRCharacterTemplate = ECE<SyncedState["characterTemplates"]>;

export type RRToken = Extract<
  ECE<ECE<SyncedState["maps"]>["objects"]>,
  { type: "token" }
>;

export type RRMapLink = Extract<
  ECE<ECE<SyncedState["maps"]>["objects"]>,
  { type: "mapLink" }
>;

export type RRMapDrawingImage = Extract<
  ECE<ECE<SyncedState["maps"]>["objects"]>,
  { type: "image" }
>;

export type RRMapDrawingRectangle = Extract<
  ECE<ECE<SyncedState["maps"]>["objects"]>,
  { type: "rectangle" }
>;

export type RRMapDrawingEllipse = Extract<
  ECE<ECE<SyncedState["maps"]>["objects"]>,
  { type: "ellipse" }
>;

export type RRMapDrawingPolygon = Extract<
  ECE<ECE<SyncedState["maps"]>["objects"]>,
  { type: "polygon" }
>;

export type RRMapDrawingFreehand = Extract<
  ECE<ECE<SyncedState["maps"]>["objects"]>,
  { type: "freehand" }
>;

export type RRMapDrawingText = Extract<
  ECE<ECE<SyncedState["maps"]>["objects"]>,
  { type: "text" }
>;

export type RRMapObject = ECE<ECE<SyncedState["maps"]>["objects"]>;

export type RRMap = ECE<SyncedState["maps"]>;

export type RRMapRevealedAreas = RRMap["settings"]["revealedAreas"];

export type RRPrivateChatMessage = ECE<
  ECE<SyncedState["privateChats"]>["messages"]
>;

export type RRPrivateChat = ECE<SyncedState["privateChats"]>;

export type RRLogEntryMessage = Extract<
  ECE<SyncedState["logEntries"]>,
  { type: "message" }
>;

export type RRLogEntryAchievement = Extract<
  ECE<SyncedState["logEntries"]>,
  { type: "achievement" }
>;

export type RRDiceTemplate = ECE<SyncedState["diceTemplates"]>;

export const characterAttributeNames = [
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
  IterableElement<ECE<SyncedState["diceTemplates"]>["parts"]>,
  {
    type: "template";
  }
>;

export type RRDiceTemplatePartModifier = Extract<
  IterableElement<ECE<SyncedState["diceTemplates"]>["parts"]>,
  {
    type: "modifier";
  }
>;

export type RRDiceTemplatePartLinkedModifier = Extract<
  IterableElement<ECE<SyncedState["diceTemplates"]>["parts"]>,
  {
    type: "linkedModifier";
  }
>;

export type RRDiceTemplatePartDice = Extract<
  IterableElement<ECE<SyncedState["diceTemplates"]>["parts"]>,
  {
    type: "dice";
  }
>;

export type RRDiceTemplatePartWithDamage = Extract<
  IterableElement<ECE<SyncedState["diceTemplates"]>["parts"]>,
  {
    damage: RRDamageType;
  }
>;

export type RRDiceTemplatePart = IterableElement<
  ECE<SyncedState["diceTemplates"]>["parts"]
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
  ECE<SyncedState["logEntries"]>,
  { type: "diceRoll" }
>;

export type RRLogEntry = ECE<SyncedState["logEntries"]>;

export type RRSong = Extract<ECE<SyncedState["assets"]>, { type: "song" }>;

export type RRImage = Extract<ECE<SyncedState["assets"]>, { type: "image" }>;

export type RRAsset = RRSong | RRImage;

// This must resemble the EntityState type from @reduxjs/toolkit to work with
// createEntityAdapter
// https://redux-toolkit.js.org/api/createEntityAdapter
export interface EntityCollection<E extends { id: RRID }> {
  entities: Record<E["id"], E>;
  ids: E["id"][];
}

export function entries<E extends { id: RRID }>(
  collection: EntityCollection<E>
): E[] {
  return collection.ids.map((id) => collection.entities[id]!);
}

// useful if you want to make sure that the identity of the empty collection
// never changes.
export const EMPTY_ENTITY_COLLECTION = {
  entities: {},
  ids: [],
};

export type InitiativeTrackerSyncedState = SyncedState["initiativeTracker"];

export type EphermalPlayer = ECE<SyncedState["ephemeral"]["players"]>;

export type RRActiveSong = ValueOf<
  SyncedState["ephemeral"]["activeSongs"]["entities"]
>;

export type EphermalSyncedState = SyncedState["ephemeral"];

export type RRGlobalSettings = SyncedState["globalSettings"];

export type SyncedState = t.InferType<typeof isSyncedState>;

export const defaultMap: RRMap = {
  id: rrid<RRMap>(),
  objects: EMPTY_ENTITY_COLLECTION,
  settings: {
    backgroundColor: "#000",
    gmWorldPosition: { x: 0, y: 0 },
    gridEnabled: true,
    gridColor: "#808080",
    name: "Default Map",
    revealedAreas: null,
  },
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
  maps: {
    entities: { [defaultMap.id]: defaultMap },
    ids: [defaultMap.id],
  },
  privateChats: EMPTY_ENTITY_COLLECTION,
  logEntries: EMPTY_ENTITY_COLLECTION,
  assets: EMPTY_ENTITY_COLLECTION,
  ephemeral: {
    players: EMPTY_ENTITY_COLLECTION,
    activeSongs: EMPTY_ENTITY_COLLECTION,
  },
};

export type SyncedStateAction<
  P = unknown,
  T extends string = string,
  M extends Record<string, unknown> | undefined =
    | undefined
    | Record<string, unknown>,
  E extends unknown | undefined = undefined
> = {
  readonly payload: P;
  readonly type: T;
  readonly meta?: M;
  readonly error?: E;
};

export type SyncedStateDispatch = Dispatch<SyncedStateAction>;
