import * as z from "zod";
import type { Dispatch } from "redux";
import type { IterableElement, ValueOf } from "type-fest";
import { assertNever, rrid, withDo } from "./util";
import { isSyncedState, RRDiceTemplate } from "./validation";
import { LAST_MIGRATION_VERSION } from "./constants";
import { RRDamageType } from "./dice-roll-tree-types-and-validation";
import { assert, IsExact } from "conditional-type-checks";
import { ForceNoInlineHelper } from "./typescript-hacks";
import {
  srdConditionDescriptions,
  srdExtraConditionLike,
  srdConditionNames,
  SrdCondition,
} from "./third-party/srd/conditions";

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

export interface RRPoint {
  readonly x: number;
  readonly y: number;
}

export interface RRCapPoint {
  readonly X: number;
  readonly Y: number;
}

export type RRDiceTemplateID = MakeRRID<"diceTemplate">;

export type RRDiceTemplatePartID = MakeRRID<"diceTemplatePart">;

export type RRDiceTemplateCategoryID = MakeRRID<"diceTemplateCategory">;

export type RRActiveMusicID = MakeRRID<"activeMusic">;

export type RRAssetID = MakeRRID<"asset">;

export type RRSoundSetID = MakeRRID<"soundSet">;

export type RRPlaylistID = MakeRRID<"playlist">;

export type RRPlaylistEntryID = MakeRRID<"playlistEntry">;

interface RRFileBase {
  originalFilename: string;
  filename: string;
  mimeType: string;
}

export interface RRFileAudio extends RRFileBase {
  type: "audio";
  duration: number;
}

export interface RRFileImage extends RRFileBase {
  type: "image";
  width: number;
  height: number;
  blurHash: string;
}

export interface RRFileOther extends RRFileBase {
  type: "other";
}

export type RRFile = RRFileAudio | RRFileImage | RRFileOther;

// Extracts the entity type from an entity collection
type ECE<E extends EntityCollection<{ id: RRID }>> = ValueOf<E["entities"]>;

export interface RRAura
  extends IterableElement<ECE<SyncedState["characters"]>["auras"]> {}

export interface RRLimitedUseSkill
  extends IterableElement<ECE<SyncedState["characters"]>["limitedUseSkills"]> {}

export interface RRSpell
  extends IterableElement<ECE<SyncedState["characters"]>["spells"]> {}

export const conditionNames = [
  "blue",
  "green",
  "orange",
  "purple",
  "red",
  "teal",
  "yellow",
  ...srdConditionNames,
  ...srdExtraConditionLike,
] as const;

export type RRCharacterCondition = IterableElement<typeof conditionNames>;

export function conditionTooltip(condition: string): string {
  const name = (condition[0]?.toUpperCase() ?? "") + condition.slice(1);
  return `${name}
${withDo(srdConditionDescriptions[condition as SrdCondition], (c) =>
  c
    ? `\n${c}\n\nOpen Game Content licensed under the Open Game License Version 1.0a (see Acknowledgements)`
    : ""
)}`;
}

export interface RRInitiativeTrackerEntryCharacter
  extends Extract<
    ECE<SyncedState["initiativeTracker"]["entries"]>,
    { type: "character" }
  > {}

export interface RRInitiativeTrackerEntryLairAction
  extends Extract<
    ECE<SyncedState["initiativeTracker"]["entries"]>,
    { type: "lairAction" }
  > {}

export type RRInitiativeTrackerEntry = ECE<
  SyncedState["initiativeTracker"]["entries"]
>;

export interface RRPlayer extends ECE<SyncedState["players"]> {}

export type RRObjectVisibility = "gmOnly" | "everyone";

export interface RRCharacter extends ECE<SyncedState["characters"]> {}

export interface RRToken
  extends Extract<
    ECE<ECE<SyncedState["maps"]>["objects"]>,
    { type: "token" }
  > {}

export interface RRMapLink
  extends Extract<
    ECE<ECE<SyncedState["maps"]>["objects"]>,
    { type: "mapLink" }
  > {}

export interface RRMapDrawingImage
  extends Extract<
    ECE<ECE<SyncedState["maps"]>["objects"]>,
    { type: "image" }
  > {}

export interface RRMapDrawingRectangle
  extends Extract<
    ECE<ECE<SyncedState["maps"]>["objects"]>,
    { type: "rectangle" }
  > {}

export interface RRMapDrawingEllipse
  extends Extract<
    ECE<ECE<SyncedState["maps"]>["objects"]>,
    { type: "ellipse" }
  > {}

export interface RRMapDrawingPolygon
  extends Extract<
    ECE<ECE<SyncedState["maps"]>["objects"]>,
    { type: "polygon" }
  > {}

export interface RRMapDrawingFreehand
  extends Extract<
    ECE<ECE<SyncedState["maps"]>["objects"]>,
    { type: "freehand" }
  > {}

export interface RRMapDrawingText
  extends Extract<ECE<ECE<SyncedState["maps"]>["objects"]>, { type: "text" }> {}

export type RRMapObject = ECE<ECE<SyncedState["maps"]>["objects"]>;

export interface RRMap extends ECE<SyncedState["maps"]> {}

export type RRMapRevealedAreas = RRMap["settings"]["revealedAreas"];

export interface RRPrivateChatMessage
  extends ECE<ECE<SyncedState["privateChats"]>["messages"]> {}

export interface RRPrivateChat extends ECE<SyncedState["privateChats"]> {}

export interface RRLogEntryMessage
  extends Extract<ECE<SyncedState["logEntries"]>, { type: "message" }> {}

export interface RRLogEntryAchievement
  extends Extract<ECE<SyncedState["logEntries"]>, { type: "achievement" }> {}

export const characterAttributeNames = ["proficiency", "initiative"] as const;

assert<
  IsExact<
    keyof RRCharacter["attributes"],
    typeof characterAttributeNames[number]
  >
>(true);

export const isProficiencyValue = z
  .enum(["notProficient", "halfProficient", "proficient", "doublyProficient"])
  .or(z.number());

export const proficiencyValueStrings = [
  "notProficient",
  "halfProficient",
  "proficient",
  "doublyProficient",
] as const;

export type proficiencyValues = typeof proficiencyValueStrings[number] | number;

assert<IsExact<z.infer<typeof isProficiencyValue>, proficiencyValues>>(true);

export const skillMap: Record<
  typeof skillNames[number],
  typeof characterStatNames[number]
> = {
  Athletics: "STR",
  Acrobatics: "DEX",
  "Sleight of Hand": "DEX",
  Stealth: "DEX",
  Arcana: "INT",
  History: "INT",
  Investigation: "INT",
  Nature: "INT",
  Religion: "INT",
  "Animal Handling": "WIS",
  Insight: "WIS",
  Medicine: "WIS",
  Perception: "WIS",
  Survival: "WIS",
  Deception: "CHA",
  Intimidation: "CHA",
  Performance: "CHA",
  Persuasion: "CHA",
};

export const skillNames = [
  "Athletics",
  "Acrobatics",
  "Sleight of Hand",
  "Stealth",
  "Arcana",
  "History",
  "Investigation",
  "Nature",
  "Religion",
  "Animal Handling",
  "Insight",
  "Medicine",
  "Perception",
  "Survival",
  "Deception",
  "Intimidation",
  "Performance",
  "Persuasion",
] as const;

assert<IsExact<keyof RRCharacter["skills"], typeof skillNames[number]>>(true);

export const characterStatNames = [
  "STR",
  "DEX",
  "CON",
  "INT",
  "WIS",
  "CHA",
] as const;

assert<IsExact<keyof RRCharacter["stats"], typeof characterStatNames[number]>>(
  true
);

assert<
  IsExact<keyof RRCharacter["savingThrows"], typeof characterStatNames[number]>
>(true);

export interface RRDiceTemplatePartTemplate
  extends Extract<
    IterableElement<RRDiceTemplate["parts"]>,
    {
      type: "template";
    }
  > {}

export interface RRDiceTemplatePartModifier
  extends Extract<
    IterableElement<RRDiceTemplate["parts"]>,
    {
      type: "modifier";
    }
  > {}

export interface RRDiceTemplatePartLinkedModifier
  extends Extract<
    IterableElement<RRDiceTemplate["parts"]>,
    {
      type: "linkedModifier";
    }
  > {}

export interface RRDiceTemplatePartLinkedProficiency
  extends Extract<
    IterableElement<RRDiceTemplate["parts"]>,
    {
      type: "linkedProficiency";
    }
  > {}

export interface RRDiceTemplatePartLinkedStat
  extends Extract<
    IterableElement<RRDiceTemplate["parts"]>,
    {
      type: "linkedStat";
    }
  > {}

export interface RRDiceTemplatePartDice
  extends Extract<
    IterableElement<RRDiceTemplate["parts"]>,
    {
      type: "dice";
    }
  > {}

export type RRDiceTemplatePartWithDamage = Extract<
  IterableElement<RRDiceTemplate["parts"]>,
  {
    damage: RRDamageType;
  }
>;

export type RRDiceTemplatePart = IterableElement<RRDiceTemplate["parts"]>;

// Default categories that can't be changed by the user
export const fixedCategoryIcons = ["hand", "shield", "d20"] as const;

export const userCategoryIcons = [
  "book",
  "broom",
  "cat",
  "comments",
  "dragon",
  "dungeon",
  "feather",
  "fire",
  "fist",
  "flask",
  "handHoldingMedical",
  "hatWizard",
  "heart",
  "hiking",
  "horse",
  "magic",
  "prayingHands",
  "scales",
  "scroll",
  "wrench",
] as const;

export const categoryIcons = [
  ...userCategoryIcons,
  ...fixedCategoryIcons,
] as const;

export const damageTypesWithoutNull = [
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

export const damageTypes = [null, ...damageTypesWithoutNull] as const;

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

export const multipleRollValues = [
  "advantage",
  "disadvantage",
  "none",
] as const;

export type RRMultipleRoll = IterableElement<typeof multipleRollValues>;

export interface RRLogEntryDiceRoll
  extends Extract<ECE<SyncedState["logEntries"]>, { type: "diceRoll" }> {}

export type RRLogEntry = ECE<SyncedState["logEntries"]>;

export interface RRAssetSong
  extends Extract<ECE<SyncedState["assets"]>, { type: "song" }> {}

export interface RRAssetImage
  extends Extract<ECE<SyncedState["assets"]>, { type: "image" }> {}

export interface RRAssetOther
  extends Extract<ECE<SyncedState["assets"]>, { type: "other" }> {}

export type RRAsset = RRAssetSong | RRAssetImage | RRAssetOther;

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

export interface RRSoundSet extends ECE<SyncedState["soundSets"]> {}

export interface RRPlaylist extends IterableElement<RRSoundSet["playlists"]> {}

export type RRPlaylistEntry = IterableElement<RRPlaylist["entries"]>;

export interface RRPlaylistEntrySong
  extends Extract<RRPlaylistEntry, { type: "song" }> {}

export interface RRPlaylistEntrySilence
  extends Extract<RRPlaylistEntry, { type: "silence" }> {}

export interface EphemeralPlayer
  extends ECE<SyncedState["ephemeral"]["players"]> {}

export type RRActiveSongOrSoundSet = ValueOf<
  SyncedState["ephemeral"]["activeMusic"]["entities"]
>;

export interface RRActiveSong
  extends Extract<RRActiveSongOrSoundSet, { type: "song" }> {}

export interface RRActiveSoundSet
  extends Extract<RRActiveSongOrSoundSet, { type: "soundSet" }> {}

export type EphemeralSyncedState = SyncedState["ephemeral"];

export type RRGlobalSettings = SyncedState["globalSettings"];

export interface SyncedState
  extends ForceNoInlineHelper<z.infer<typeof isSyncedState>> {}

export function makeDefaultMap() {
  return {
    id: rrid<RRMap>(),
    objects: EMPTY_ENTITY_COLLECTION,
    settings: {
      atmosphere: { type: "none" as const, intensity: 0 },
      backgroundColor: "#000",
      gmWorldPosition: { x: 0, y: 0 },
      gridEnabled: true,
      gridColor: "#808080",
      name: "Default Map",
      revealedAreas: null,
    },
  };
}

export const defaultMap: RRMap = makeDefaultMap();

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
  maps: {
    entities: { [defaultMap.id]: defaultMap },
    ids: [defaultMap.id],
  },
  privateChats: EMPTY_ENTITY_COLLECTION,
  logEntries: EMPTY_ENTITY_COLLECTION,
  assets: EMPTY_ENTITY_COLLECTION,
  soundSets: EMPTY_ENTITY_COLLECTION,
  ephemeral: {
    players: EMPTY_ENTITY_COLLECTION,
    activeMusic: EMPTY_ENTITY_COLLECTION,
  },
};

export interface SyncedStateAction<
  P = unknown,
  T extends string = string,
  M extends Record<string, unknown> | undefined =
    | undefined
    | Record<string, unknown>,
  E extends unknown | undefined = undefined
> {
  readonly payload: P;
  readonly type: T;
  readonly meta?: M;
  readonly error?: E;
}

export type SyncedStateDispatch = Dispatch<SyncedStateAction>;
