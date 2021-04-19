import { PayloadAction } from "@reduxjs/toolkit";
import { Dispatch } from "redux";
import { Opaque } from "type-fest";
import { rrid } from "./util";

export type RRID = Opaque<string>;

export type RRPlayerID = Opaque<string, "player">;

export type RRTokenID = Opaque<string, "token">;

export type RRMapID = Opaque<string, "map">;

export type RRTokenOnMapID = Opaque<string, "tokenOnMap">;

export type RRPrivateChatID = Opaque<string, "privateChat">;

export type RRPrivateChatMessageID = Opaque<string, "privateChatMessage">;

export type RRLogEntryID = Opaque<string, "logEntry">;

export type RRInitiativeTrackerEntryID = Opaque<string, "initiativeEntry">;

export type RRColor = string;

export type RRPoint = { x: number; y: number };

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

export type RRTokenCondition = string;

export type RRTimestamp = Opaque<number, "timestamp">;

interface RRInitiativeTrackerEntryBase {
  id: RRInitiativeTrackerEntryID;
  initiative: number;
}

export interface RRInitiativeTrackerEntryToken
  extends RRInitiativeTrackerEntryBase {
  type: "token";
  tokenId: RRTokenID;
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
  id: RRPlayerID;
  name: string;
  color: RRColor;
  isGM: boolean;
  currentMap: RRMapID;
  tokenIds: RRTokenID[];

  isOnline: boolean;
};

export type RRToken = {
  id: RRTokenID;
  name: string;

  image: RRFile | null;
  size: number;

  auras: RRAura[];
  hp: number;
  maxHP: number;
  conditions: RRTokenCondition[];

  visibility: "gmOnly" | "everyone";
  isTemplate: boolean;
};

export type RRTokenOnMap = {
  id: RRTokenOnMapID;
  tokenId: RRTokenID;
  position: RRPoint;
};

export type RRMap = {
  id: RRMapID;
  name: string;

  tokens: EntityCollection<RRTokenOnMap>;
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

export type TokensSyncedState = EntityCollection<RRToken>;

export type MapsSyncedState = EntityCollection<RRMap>;

export type PrivateChatsSyncedState = EntityCollection<RRPrivateChat>;

export type LogEntriesSyncedState = EntityCollection<RRLogEntry>;

export interface SyncedState {
  initiativeTracker: InitiativeTrackerSyncedState;
  players: PlayersSyncedState;
  tokens: TokensSyncedState;
  maps: MapsSyncedState;
  privateChats: PrivateChatsSyncedState;
  logEntries: LogEntriesSyncedState;
}

const defaultMap: RRMap = {
  backgroundColor: "#000",
  backgroundImages: [],
  gmWorldPosition: { x: 0, y: 0 },
  grid: { enabled: true, size: { x: 70, y: 70 } },
  name: "unnamed",
  tokens: {
    entities: {},
    ids: [],
  },
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
  tokens: {
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
};

// TODO
export type SyncedStateAction = PayloadAction<any>;

export type SyncedStateDispatch = Dispatch<SyncedStateAction>;
