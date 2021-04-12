import { createAction, nanoid, Update } from "@reduxjs/toolkit";
import {
  InitiativeTrackerSyncedState,
  RRInitiativeTrackerEntry,
  RRInitiativeTrackerEntryLayerAction,
  RRInitiativeTrackerEntryToken,
  RRLogEntry,
  RRLogEntryDiceRoll,
  RRLogEntryMessage,
  RRMap,
  RRPlayer,
  RRPrivateChat,
  RRToken,
} from "./state";

////////////////////////////////////////////////////////////////////////////////
// Players
////////////////////////////////////////////////////////////////////////////////

export const playerAdd = createAction(
  "player/add",
  (player: Omit<RRPlayer, "id">) => ({
    payload: { id: nanoid(), ...player },
  })
);

export const playerUpdate = createAction<Update<RRPlayer>>("player/update");

export const playerRemove = createAction<RRPlayer["id"]>("player/remove");

////////////////////////////////////////////////////////////////////////////////
// Tokens
////////////////////////////////////////////////////////////////////////////////

export const tokenAdd = createAction(
  "token/add",
  (token: Omit<RRToken, "id">) => ({
    payload: { id: nanoid(), ...token },
  })
);

export const tokenUpdate = createAction<Update<RRToken>>("token/update");

export const tokenRemove = createAction<RRToken["id"]>("token/remove");

////////////////////////////////////////////////////////////////////////////////
// Maps
////////////////////////////////////////////////////////////////////////////////

export const mapAdd = createAction("map/add", (map: Omit<RRMap, "id">) => ({
  payload: { id: nanoid(), ...map },
}));

export const mapUpdate = createAction<Update<RRMap>>("map/update");

export const mapRemove = createAction<RRMap["id"]>("map/remove");

////////////////////////////////////////////////////////////////////////////////
// PrivateChats
////////////////////////////////////////////////////////////////////////////////

export const privateChatAdd = createAction(
  "privatechat/add",
  (privatechat: Omit<RRPrivateChat, "id">) => ({
    payload: { id: nanoid(), ...privatechat },
  })
);

export const privateChatUpdate = createAction<Update<RRPrivateChat>>(
  "privatechat/update"
);

export const privateChatRemove = createAction<RRPrivateChat["id"]>(
  "privatechat/remove"
);

////////////////////////////////////////////////////////////////////////////////
// LogEntries
////////////////////////////////////////////////////////////////////////////////

export const logEntryMessageAdd = createAction(
  "logentry/message/add",
  (logEntry: Omit<RRLogEntryMessage, "id" | "type">) => ({
    payload: { id: nanoid(), type: "message", ...logEntry },
  })
);

export const logEntryDiceRollAdd = createAction(
  "logentry/diceroll/add",
  (logEntry: Omit<RRLogEntryDiceRoll, "id" | "type">) => ({
    payload: { id: nanoid(), type: "diceRoll", ...logEntry },
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
  ) => ({
    payload: { id: nanoid(), type: "token", ...initiativetrackerEntry },
  })
);

export const initiativeTrackerEntryLayerActionAdd = createAction(
  "initiativetracker/entry/layeraction/add",
  (
    initiativetrackerEntry: Omit<
      RRInitiativeTrackerEntryLayerAction,
      "id" | "type"
    >
  ) => ({
    payload: { id: nanoid(), type: "layerAction", ...initiativetrackerEntry },
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
