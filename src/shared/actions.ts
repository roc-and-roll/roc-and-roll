import { createAction, nanoid, Update } from "@reduxjs/toolkit";
import {
  InitiativeTrackerSyncedState,
  RRInitiativeTrackerEntry,
  RRLogEntry,
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

export const logEntryAdd = createAction(
  "logentry/add",
  (logEntry: Omit<RRLogEntry, "id">) => ({
    payload: { id: nanoid(), ...logEntry },
  })
);

// export const logEntryUpdate = createAction<Update<RRLogEntry>>(
//   "logentry/update"
// );

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

export const initiativeTrackerAdd = createAction(
  "initiativetracker/add",
  (initiativetrackerEntry: Omit<RRInitiativeTrackerEntry, "id">) => ({
    payload: { id: nanoid(), ...initiativetrackerEntry },
  })
);

export const initiativeTrackerUpdate = createAction<
  Update<RRInitiativeTrackerEntry>
>("initiativetracker/update");

export const initiativeTrackerRemove = createAction<
  RRInitiativeTrackerEntry["id"]
>("initiativetracker/remove");
