import { nanoid, PayloadAction } from "@reduxjs/toolkit";
import { Dispatch } from "redux";

export type RRID = string;

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

export type RRTimestamp = number;

interface RRInitiativeTrackerEntryBase {
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

  image: RRFile | null;
  size: number;

  auras: RRAura[];
  hp: number;
  maxHP: number;
  conditions: RRTokenCondition[];

  visibility: "gmOnly" | "everyone";
  isTemplate: boolean;
};

export type RRTokenOnMap = { tokenId: RRID; position: RRPoint };

export type RRMap = {
  id: RRID;
  name: string;

  tokens: Array<RRTokenOnMap>;
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
interface RRBaseLogEntry {
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
export interface EntityCollection<E extends { id: RRID }> {
  entities: Record<RRID, E>;
  ids: RRID[];
}

export interface InitiativeTrackerSyncedState {
  visible: boolean;
  entries: EntityCollection<RRInitiativeTrackerEntry>;
  currentEntryId: RRID | null;
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
  tokens: [],
  id: nanoid(),
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
