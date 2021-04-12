import { PayloadAction } from "@reduxjs/toolkit";
import { Dispatch } from "redux";
import { JsonObject } from "type-fest";

export type RRID = string;

export type RRColor = { r: number; g: number; b: number };

export type RRPoint = { x: number; y: number };

export type RRFile = {
  originalFilename: string;
  filename: string;
};

export type RRAura = {
  size: number;
};

export type RRTokenCondition = string;

export type RRTimestamp = number;

interface RRInitiativeTrackerEntryBase extends JsonObject {
  id: RRID;
  initiative: number;
}

export interface RRInitiativeTrackerEntryToken
  extends RRInitiativeTrackerEntryBase {
  type: "token";
  tokenId: RRID;
}

export interface RRInitiativeTrackerEntryLayerAction
  extends RRInitiativeTrackerEntryBase {
  type: "layerAction";
  description: string;
}

export type RRInitiativeTrackerEntry =
  | RRInitiativeTrackerEntryToken
  | RRInitiativeTrackerEntryLayerAction;

export type RRPlayer = {
  id: RRID;
  name: string;
  color: RRColor;
  isGM: boolean;
  currentMap: RRID;
  tokenIds: RRID[];

  isOnline: boolean;
};

export type RRToken = {
  id: RRID;
  name: string;

  image: RRFile;
  size: number;

  aura: RRAura;
  hp: number;
  maxHP: number;
  conditions: RRTokenCondition[];

  visibility: "gmOnly" | "everyone";
  isTemplate: boolean;
};

export type RRMap = {
  id: RRID;
  name: string;

  tokens: Array<{ tokenId: RRID; position: RRPoint }>;
  backgroundImages: Array<{
    image: RRFile;
    position: RRPoint;
    scale: number;
  }>;
  backgroundColor: RRColor;

  grid: {
    enabled: boolean;
    size: RRPoint;
    // type: "square" | "hex";
  };

  gmWorldPosition: RRPoint;
};

export type RRPrivateChat = {
  id: RRID;
  playerAId: RRID;
  playerBId: RRID;
  messages: Array<{
    direction: "a2b" | "b2a";
    text: string;
    timestamp: RRTimestamp;
  }>;
};

// We extend JsonObject here just to verify that we do not use any
// non-serializable properties like Dates.
// Extending JsonObject makes no difference at runtime.
interface RRBaseLogEntry extends JsonObject {
  id: RRID;
  silent: boolean;
  playerId: RRID | null;
  timestamp: RRTimestamp;
}

export interface RRLogEntryMessage extends RRBaseLogEntry {
  type: "message";
  payload: {
    text: string;
  };
}

// export interface RRLogEntryAchievement extends RRBaseLogEntry {
//   type: "achievement";
//   payload: {
//   };
// }

export interface RRLogEntryDiceRoll extends RRBaseLogEntry {
  type: "diceRoll";
  payload: {
    dice: Array<{
      damageType: string;
      result: number;
      die: null | {
        faces: number; // 4, 6, 8, 10, 12, 20, 100
        count: number; // number of dice

        // TODO
        //         used: number;
        //         style: string;
        //         effect: string;
      };
    }>;
  };
}

export type RRLogEntry =
  | RRLogEntryMessage
  //  | RRLogEntryAchievement
  | RRLogEntryDiceRoll;

// This must resemble the EntityState type from @reduxjs/toolkit to work with
// createEntityAdapter
// https://redux-toolkit.js.org/api/createEntityAdapter
interface EntityCollection<E extends { id: RRID }> extends JsonObject {
  entities: Record<RRID, E>;
  ids: RRID[];
}

export interface InitiativeTrackerSyncedState extends JsonObject {
  visible: boolean;
  entries: EntityCollection<RRInitiativeTrackerEntry>;
  currentEntryId: RRID | null;
}

export type PlayersSyncedState = EntityCollection<RRPlayer>;

export type TokensSyncedState = EntityCollection<RRToken>;

export type MapsSyncedState = EntityCollection<RRMap>;

export type PrivateChatsSyncedState = EntityCollection<RRPrivateChat>;

export type LogEntriesSyncedState = EntityCollection<RRLogEntry>;

// We extend JsonObject here just to verify that we do not use any
// non-serializable properties like Dates.
// Extending JsonObject makes no difference at runtime.
// TODO: JsonObject may be the wrong thing. Hmm.
export interface SyncedState extends JsonObject {
  initiativeTracker: InitiativeTrackerSyncedState;
  players: PlayersSyncedState;
  tokens: TokensSyncedState;
  maps: MapsSyncedState;
  privateChats: PrivateChatsSyncedState;
  logEntries: LogEntriesSyncedState;
}

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
  tokens: {
    entities: {},
    ids: [],
  },
  maps: {
    entities: {},
    ids: [],
  },
  privateChats: {
    entities: {},
    ids: [],
  },
  logEntries: {
    entities: {},
    ids: [],
  },
};

// TODO
export type SyncedStateAction = PayloadAction<any>;

export type SyncedStateDispatch = Dispatch<SyncedStateAction>;
