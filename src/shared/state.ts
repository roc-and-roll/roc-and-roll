import type { PayloadAction } from "@reduxjs/toolkit";
import type { Dispatch } from "redux";
import type { Opaque } from "type-fest";
import { rrid } from "./util";

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

export type RRPoint = { readonly x: number; readonly y: number };

export type RRDiceTemplateID = Opaque<string, "diceTemplate">;

export type RRActiveSongID = Opaque<string, "activeSong">;

export type RRAssetID = Opaque<string, "asset">;

export type RRFile = {
  originalFilename: string;
  filename: string;
};

export type RRAura = {
  size: number;
  color: RRColor;
  shape: "circle" | "square";
  visibility: "playerOnly" | "playerAndGM" | "everyone";
  visibileWhen: "always" | "onTurn" | "hover";
};

export type RRCharacterCondition = string;

export type RRTimestamp = Opaque<number, "timestamp">;

interface RRInitiativeTrackerEntryBase {
  id: RRInitiativeTrackerEntryID;
  initiative: number;
}

export interface RRInitiativeTrackerEntryCharacter
  extends RRInitiativeTrackerEntryBase {
  type: "character";
  characterIds: RRCharacterID[];
}

export interface RRInitiativeTrackerEntryLairAction
  extends RRInitiativeTrackerEntryBase {
  type: "lairAction";
  description: string;
}

export type RRInitiativeTrackerEntry =
  | RRInitiativeTrackerEntryCharacter
  | RRInitiativeTrackerEntryLairAction;

export type RRPlayer = {
  id: RRPlayerID;
  name: string;
  color: RRColor;
  isGM: boolean;
  currentMap: RRMapID;
  characterIds: RRCharacterID[];
};

export type RRCharacter = {
  id: RRCharacterID;
  name: string;

  image: RRFile | null;
  scale: number;

  auras: RRAura[];
  hp: number;
  maxHP: number;
  conditions: RRCharacterCondition[];

  visibility: "gmOnly" | "everyone";
  localToMap?: RRMapID;
};

type RRMapObjectBase = {
  id: RRMapObjectID;
  position: RRPoint;
  playerId: RRPlayerID;
};

export interface RRToken extends RRMapObjectBase {
  type: "token";
  characterId: RRCharacterID;
}

export interface RRMapDrawingBase extends RRMapObjectBase {
  locked: boolean;
  color: RRColor;
}

export interface RRMapDrawingImage extends RRMapDrawingBase {
  type: "image";
  image: RRFile;
  size: RRPoint;
}

export interface RRMapDrawingRectangle extends RRMapDrawingBase {
  type: "rectangle";
  size: RRPoint;
}

export interface RRMapDrawingEllipse extends RRMapDrawingBase {
  type: "ellipse";
  size: RRPoint;
}

export interface RRMapDrawingPolygon extends RRMapDrawingBase {
  type: "polygon";
  // a polygon with three corners only has two entries in the points array,
  // because the first point is always implicitly 0, 0.
  points: RRPoint[];
}

export interface RRMapDrawingFreehand extends RRMapDrawingBase {
  type: "freehand";
  // a freehand drawing with three points only has two entries in the points
  // array, because the first point is always implicitly 0, 0.
  points: RRPoint[];
}

export interface RRMapDrawingText extends RRMapDrawingBase {
  type: "text";
  text: string;
}

export type RRMapObject =
  | RRToken
  | RRMapDrawingImage
  | RRMapDrawingRectangle
  | RRMapDrawingEllipse
  | RRMapDrawingPolygon
  | RRMapDrawingFreehand
  | RRMapDrawingText;

export type RRMap = {
  id: RRMapID;
  name: string;

  objects: EntityCollection<RRMapObject>;

  backgroundColor: RRColor;
  gridEnabled: boolean;

  gmWorldPosition: RRPoint;
};

export type RRPrivateChatMessage = {
  id: RRPrivateChatMessageID;
  direction: "a2b" | "b2a";
  text: string;
  read: boolean;
  timestamp: RRTimestamp;
};

export type RRPrivateChat = {
  id: RRPrivateChatID;
  idA: RRPlayerID;
  idB: RRPlayerID;
  messages: EntityCollection<RRPrivateChatMessage>;
};

// We extend JsonObject here just to verify that we do not use any
// non-serializable properties like Dates.
// Extending JsonObject makes no difference at runtime.
interface RRBaseLogEntry {
  id: RRLogEntryID;
  silent: boolean;
  playerId: RRPlayerID | null;
  timestamp: RRTimestamp;
}

export interface RRLogEntryMessage extends RRBaseLogEntry {
  type: "message";
  payload: {
    text: string;
  };
}

export interface RRLogEntryAchievement extends RRBaseLogEntry {
  type: "achievement";
  payload: {
    achievementId: number;
  };
}

export interface RRDiceTemplate {
  name?: string;
  id: RRDiceTemplateID;
  playerId: RRPlayerID;
  rollType: "initiative" | "hit" | "attack" | null;
  dice: Array<RRDice | RRModifier>;
}

export type RRDamageType = null | "fire" | "thunder";

export type RRMultipleRoll = "advantage" | "disadvantage" | "none";

export interface RRRollPart {
  damageType: RRDamageType;
}

export interface RRDice extends RRRollPart {
  type: "dice";
  faces: number; // 4, 6, 8, 10, 12, 20, 100
  modified: RRMultipleRoll;
  diceResults: number[];
  negated: boolean;

  // TODO
  //         used: number;
  //         style: string;
  //         effect: string;
}

export interface RRModifier extends RRRollPart {
  type: "modifier";
  modifier: number;
}

export interface RRLogEntryDiceRoll extends RRBaseLogEntry {
  type: "diceRoll";
  payload: {
    rollType: "initiative" | "hit" | "attack" | null;
    dice: Array<RRDice | RRModifier>;
  };
}

export type RRLogEntry =
  | RRLogEntryMessage
  | RRLogEntryAchievement
  | RRLogEntryDiceRoll;

export interface RRAsset {
  id: RRAssetID;
  type: string;
  name: string;
  external: boolean;
  filenameOrUrl: string;
  playerId: RRPlayerID;
}

export interface RRSong extends RRAsset {
  type: "song";
  tags: string[];
  durationSeconds: number;
}

export interface RRImage extends RRAsset {
  type: "image";
  // TODO: evaluate if this is necessary
  originalFunction: "token" | "map";
}

// This must resemble the EntityState type from @reduxjs/toolkit to work with
// createEntityAdapter
// https://redux-toolkit.js.org/api/createEntityAdapter
export interface EntityCollection<E extends { id: RRID }> {
  entities: Record<E["id"], E>;
  ids: E["id"][];
}

export interface InitiativeTrackerSyncedState {
  visible: boolean;
  entries: EntityCollection<RRInitiativeTrackerEntry>;
  currentEntryId: RRInitiativeTrackerEntryID | null;
}

export type PlayersSyncedState = EntityCollection<RRPlayer>;

export type CharactersSyncedState = EntityCollection<RRCharacter>;

export type CharacterTemplatesSyncedState = EntityCollection<RRCharacter>;

export type MapsSyncedState = EntityCollection<RRMap>;

export type PrivateChatsSyncedState = EntityCollection<RRPrivateChat>;

export type LogEntriesSyncedState = EntityCollection<RRLogEntry>;

export type DiceTemplateState = EntityCollection<RRDiceTemplate>;

export type AssetsSyncedState = EntityCollection<RRAsset>;

export type EphermalPlayer = {
  id: RRPlayerID;
  isOnline: boolean;
  mapMouse: null | {
    position: RRPoint;
    positionHistory: RRPoint[];
    lastUpdate: RRTimestamp;
  };
  measurePath: RRPoint[];
};

export interface RRActiveSong {
  id: RRActiveSongID;
  song: RRSong;
  startedAt: number;
  volume: number;
}

export type EphermalSyncedState = {
  players: EntityCollection<EphermalPlayer>;
  activeSongs: EntityCollection<RRActiveSong>;
};

export interface SyncedState {
  initiativeTracker: InitiativeTrackerSyncedState;
  players: PlayersSyncedState;
  characters: CharactersSyncedState;
  characterTemplates: CharacterTemplatesSyncedState;
  maps: MapsSyncedState;
  privateChats: PrivateChatsSyncedState;
  logEntries: LogEntriesSyncedState;
  diceTemplates: DiceTemplateState;
  assets: AssetsSyncedState;
  // All ephermal state is cleared when the server restarts
  ephermal: EphermalSyncedState;
}

export const defaultMap: RRMap = {
  backgroundColor: "#000",
  objects: {
    entities: {},
    ids: [],
  },
  gmWorldPosition: { x: 0, y: 0 },
  gridEnabled: true,
  name: "unnamed",
  id: rrid<RRMap>(),
};

export const initialSyncedState: SyncedState = {
  initiativeTracker: {
    visible: false,
    currentEntryId: null,
    entries: {
      entities: {},
      ids: [],
    },
  },
  players: {
    entities: {},
    ids: [],
  },
  characters: {
    entities: {},
    ids: [],
  },
  characterTemplates: {
    entities: {},
    ids: [],
  },
  diceTemplates: {
    entities: {},
    ids: [],
  },
  maps: {
    entities: { [defaultMap.id]: defaultMap },
    ids: [defaultMap.id],
  },
  privateChats: {
    entities: {},
    ids: [],
  },
  logEntries: {
    entities: {},
    ids: [],
  },
  assets: {
    entities: {},
    ids: [],
  },
  ephermal: {
    players: {
      entities: {},
      ids: [],
    },
    activeSongs: {
      entities: {},
      ids: [],
    },
  },
};

export type SyncedStateAction<
  P = void,
  T extends string = string,
  M = never
> = PayloadAction<P, T, M, never> & {
  meta?: {
    __optimisticUpdateId__?: OptimisticUpdateID;
  };
};

export type SyncedStateDispatch = Dispatch<SyncedStateAction>;

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
