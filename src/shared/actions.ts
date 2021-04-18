import { createAction, Update as OriginalUpdate } from "@reduxjs/toolkit";
import {
  InitiativeTrackerSyncedState,
  RRID,
  RRInitiativeTrackerEntry,
  RRInitiativeTrackerEntryLayerAction,
  RRInitiativeTrackerEntryToken,
  RRLogEntry,
  RRLogEntryDiceRoll,
  RRLogEntryMessage,
  RRMap,
  RRPlayer,
  RRPlayerID,
  RRPrivateChat,
  RRPrivateChatID,
  RRPrivateChatMessage,
  RRToken,
} from "./state";
import { rrid, timestamp } from "./util";

interface Update<T extends { id: RRID }> extends OriginalUpdate<Omit<T, "id">> {
  id: T["id"]; // tighten the type of id to the opaque RRID
}

////////////////////////////////////////////////////////////////////////////////
// Players
////////////////////////////////////////////////////////////////////////////////

export const playerAdd = createAction(
  "player/add",
  (player: Omit<RRPlayer, "id">): { payload: RRPlayer } => ({
    payload: { id: rrid<RRPlayer>(), ...player },
  })
);

export const playerUpdate = createAction<Update<RRPlayer>>("player/update");

export const playerRemove = createAction<RRPlayer["id"]>("player/remove");

////////////////////////////////////////////////////////////////////////////////
// Tokens
////////////////////////////////////////////////////////////////////////////////

export const tokenAdd = createAction(
  "token/add",
  (token: Omit<RRToken, "id">): { payload: RRToken } => ({
    payload: { id: rrid<RRToken>(), ...token },
  })
);

export const tokenUpdate = createAction<Update<RRToken>>("token/update");

export const tokenRemove = createAction<RRToken["id"]>("token/remove");

////////////////////////////////////////////////////////////////////////////////
// Maps
////////////////////////////////////////////////////////////////////////////////

export const mapAdd = createAction("map/add", (map: Omit<RRMap, "id">) => ({
  payload: { id: rrid<RRMap>(), ...map },
}));

export const mapUpdate = createAction<Update<RRMap>>("map/update");

export const mapRemove = createAction<RRMap["id"]>("map/remove");

////////////////////////////////////////////////////////////////////////////////
// PrivateChats
////////////////////////////////////////////////////////////////////////////////

export const privateChatAdd = createAction(
  "privatechat/add",
  (
    player1Id: RRPlayerID,
    player2Id: RRPlayerID
  ): { payload: RRPrivateChat } => {
    let idA, idB;
    if (player1Id < player2Id) {
      idA = player1Id;
      idB = player2Id;
    } else {
      idA = player2Id;
      idB = player1Id;
    }

    return {
      payload: {
        id: rrid<RRPrivateChat>(),
        idA,
        idB,
        messages: {
          entities: {},
          ids: [],
        },
      },
    };
  }
);

export const privateChatUpdate = createAction<
  Update<Omit<RRPrivateChat, "messages">>
>("privatechat/update");

export const privateChatRemove = createAction<RRPrivateChat["id"]>(
  "privatechat/remove"
);

export const privateChatMessageAdd = createAction(
  "privatechat/message/add",
  (
    chatId: RRPrivateChatID,
    message: Omit<RRPrivateChatMessage, "id" | "timestamp" | "read">
  ): {
    payload: { chatId: RRPrivateChatID; message: RRPrivateChatMessage };
  } => {
    return {
      payload: {
        chatId,
        message: {
          id: rrid<RRPrivateChatMessage>(),
          timestamp: timestamp(),
          read: false,
          ...message,
        },
      },
    };
  }
);

export const privateChatMessageUpdate = createAction(
  "privatechat/message/update",
  (
    chatId: RRPrivateChatID,
    update: Update<Omit<RRPrivateChatMessage, "timestamp">>
  ) => {
    return {
      payload: {
        chatId,
        update,
      },
    };
  }
);

////////////////////////////////////////////////////////////////////////////////
// LogEntries
////////////////////////////////////////////////////////////////////////////////

export const logEntryMessageAdd = createAction(
  "logentry/message/add",
  (
    logEntry: Omit<RRLogEntryMessage, "id" | "type" | "timestamp">
  ): { payload: RRLogEntryMessage } => ({
    payload: {
      id: rrid<RRLogEntryMessage>(),
      type: "message",
      timestamp: timestamp(),
      ...logEntry,
    },
  })
);

export const logEntryDiceRollAdd = createAction(
  "logentry/diceroll/add",
  (
    logEntry: Omit<RRLogEntryDiceRoll, "id" | "type" | "timestamp">
  ): { payload: RRLogEntryDiceRoll } => ({
    payload: {
      id: rrid<RRLogEntryDiceRoll>(),
      type: "diceRoll",
      timestamp: timestamp(),
      ...logEntry,
    },
  })
);

export const logEntryRemove = createAction<RRLogEntry["id"]>("logentry/remove");

////////////////////////////////////////////////////////////////////////////////
// InitiativeTracker
////////////////////////////////////////////////////////////////////////////////

export const initiativeTrackerSetVisible = createAction<
  InitiativeTrackerSyncedState["visible"]
>("initiativeTracker/visible");

export const initiativeTrackersetCurrentEntry = createAction<
  InitiativeTrackerSyncedState["currentEntryId"]
>("initiativeTracker/currentEntryId");

export const initiativeTrackerEntryTokenAdd = createAction(
  "initiativetracker/entry/token/add",
  (
    initiativetrackerEntry: Omit<RRInitiativeTrackerEntryToken, "id" | "type">
  ): { payload: RRInitiativeTrackerEntryToken } => ({
    payload: {
      id: rrid<RRInitiativeTrackerEntryToken>(),
      type: "token",
      ...initiativetrackerEntry,
    },
  })
);

export const initiativeTrackerEntryLayerActionAdd = createAction(
  "initiativetracker/entry/layeraction/add",
  (
    initiativetrackerEntry: Omit<
      RRInitiativeTrackerEntryLayerAction,
      "id" | "type"
    >
  ): { payload: RRInitiativeTrackerEntryLayerAction } => ({
    payload: {
      id: rrid<RRInitiativeTrackerEntryLayerAction>(),
      type: "layerAction",
      ...initiativetrackerEntry,
    },
  })
);

export const initiativeTrackerEntryTokenUpdate = createAction<
  Update<RRInitiativeTrackerEntryToken>
>("initiativetracker/entry/token/update");

export const initiativeTrackerEntryLayerActionUpdate = createAction<
  Update<RRInitiativeTrackerEntryLayerAction>
>("initiativetracker/entry/layeraction/update");

export const initiativeTrackerEntryRemove = createAction<
  RRInitiativeTrackerEntry["id"]
>("initiativetracker/entry/remove");
