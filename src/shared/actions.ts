import { createAction } from "@reduxjs/toolkit";
import type { Update as OriginalUpdate } from "@reduxjs/toolkit";
import {
  EphemeralPlayer,
  InitiativeTrackerSyncedState,
  RRID,
  RRInitiativeTrackerEntry,
  RRInitiativeTrackerEntryLairAction,
  RRInitiativeTrackerEntryCharacter,
  RRLogEntry,
  RRLogEntryDiceRoll,
  RRLogEntryMessage,
  RRMap,
  RRMapObject,
  RRMapID,
  RRPlayer,
  RRPlayerID,
  RRPrivateChat,
  RRPrivateChatID,
  RRPrivateChatMessage,
  RRCharacter,
  RRCharacterID,
  RRLogEntryAchievement,
  RRActiveSongOrSoundSet,
  RRAssetImage,
  RRAssetSong,
  RRToken,
  RRMapObjectID,
  RRAssetID,
  RRGlobalSettings,
  EMPTY_ENTITY_COLLECTION,
  RRPlaylist,
  RRPlaylistEntryID,
  RRSoundSet,
  RRPlaylistID,
  RRPlaylistEntry,
  RRAsset,
  RRDiceTemplateCategoryID,
  RRDiceTemplateID,
  RRDiceTemplatePart,
  RRDiceTemplatePartID,
} from "./state";
import { rrid, timestamp } from "./util";
import type {
  RRDiceTemplate,
  // We need this import for #reasons, otherwise TypeScript won't compile.
  // eslint-disable-next-line unused-imports/no-unused-imports
  _RRDiceTemplate,
  RRDiceTemplateCategory,
} from "./validation";

type Update<T extends { id: RRID }> = OriginalUpdate<T, T["id"]>;

// Omits a property from a union of types
//
// CC-BY-SA 4.0 by jcalz
// https://stackoverflow.com/a/57103940/2560557
// https://stackoverflow.com/users/2887218/jcalz
type DistributiveOmit<T, K extends keyof T> = T extends unknown
  ? Omit<T, K>
  : never;

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

export const playerUpdateAddFavoriteAssetId = createAction<{
  id: RRPlayerID;
  assetId: RRAssetID;
}>("player/update/assetId/add");

export const playerUpdateRemoveFavoriteAssetId = createAction<{
  id: RRPlayerID;
  assetId: RRAssetID;
}>("player/update/assetId/remove");

export const playerRemove = createAction<RRPlayer["id"]>("player/remove");

////////////////////////////////////////////////////////////////////////////////
// Characters
////////////////////////////////////////////////////////////////////////////////

export const characterAdd = createAction(
  "character/add",
  (character: Omit<RRCharacter, "id">): { payload: RRCharacter } => ({
    payload: { id: rrid<RRCharacter>(), ...character },
  })
);

export const characterUpdate =
  createAction<Update<RRCharacter>>("character/update");

export const characterRemove =
  createAction<RRCharacter["id"]>("character/remove");

export const playerUpdateAddCharacterId = createAction<{
  id: RRPlayerID;
  characterId: RRCharacterID;
}>("player/update/characterId");

export const characterAddDiceTemplateCategory = createAction<{
  id: RRCharacterID;
  category: RRDiceTemplateCategory;
}>("character/diceTemplateCategories/add");

export const characterUpdateDiceTemplateCategory = createAction<{
  id: RRCharacterID;
  category: Update<RRDiceTemplateCategory>;
}>("character/diceTemplateCategories/update");

export const characterDeleteDiceTemplateCategory = createAction<{
  id: RRCharacterID;
  categoryId: RRDiceTemplateCategoryID;
}>("character/diceTemplateCategories/delete");

export const characterRemoveDiceTemplate = createAction<{
  id: RRCharacterID;
  categoryId: RRDiceTemplateCategoryID;
  templateId: RRDiceTemplateID;
}>("character/diceTemplateCategories/template/remove");

export const characterUpdateDiceTemplate = createAction<{
  id: RRCharacterID;
  categoryId: RRDiceTemplateCategoryID;
  template: Update<RRDiceTemplate>;
}>("character/diceTemplateCategories/template/update");

export const characterUpdateDiceTemplatePart = createAction<{
  id: RRCharacterID;
  categoryId: RRDiceTemplateCategoryID;
  templateId: RRDiceTemplateID;
  part: Update<RRDiceTemplatePart>;
}>("character/diceTemplateCategories/template/part/update");

export const characterAddDiceTemplatePart = createAction<{
  id: RRCharacterID;
  categoryId: RRDiceTemplateCategoryID;
  templateId: RRDiceTemplateID;
  part: RRDiceTemplatePart;
}>("character/diceTemplateCategories/template/part/add");

export const characterRemoveDiceTemplatePart = createAction<{
  id: RRCharacterID;
  categoryId: RRDiceTemplateCategoryID;
  templateId: RRDiceTemplateID;
  partId: RRDiceTemplatePartID;
}>("character/diceTemplateCategories/template/part/remove");

export const characterAddDiceTemplate = createAction<{
  id: RRCharacterID;
  categoryId: RRDiceTemplateCategoryID;
  template: RRDiceTemplate;
}>("character/diceTemplateCategories/template/add");

////////////////////////////////////////////////////////////////////////////////
// Maps
////////////////////////////////////////////////////////////////////////////////

export const mapAdd = createAction("map/add", (map: Omit<RRMap, "id">) => ({
  payload: { id: rrid<RRMap>(), ...map },
}));

export const mapUpdate = createAction<Update<RRMap>>("map/update");

export const mapRemove = createAction<RRMap["id"]>("map/remove");

export const mapSettingsUpdate = createAction<{
  id: RRMapID;
  changes: Partial<RRMap["settings"]>;
}>("map/settings/update");

export const mapObjectAdd = createAction(
  "map/object/add",
  (
    mapId: RRMapID,
    mapObject: DistributiveOmit<RRMapObject, "id">
  ): {
    payload: { mapId: RRMapID; mapObject: RRMapObject };
  } => {
    return {
      payload: {
        mapId,
        mapObject: {
          ...mapObject,
          id: rrid<RRMapObject>(),
        },
      },
    };
  }
);

export const mapObjectUpdate = createAction(
  "map/object/update",
  (mapId: RRMapID, update: Update<RRMapObject>) => {
    return {
      payload: {
        mapId,
        update,
      },
    };
  }
);

interface TokenRemoval {
  mapId: RRMapID;
  mapObject: RRToken;
  relatedCharacter: RRCharacter;
}
interface OtherMapObjectRemoval {
  mapId: RRMapID;
  mapObjectId: RRMapObjectID;
}

function isTokenRemoval(
  o: TokenRemoval | OtherMapObjectRemoval
): o is TokenRemoval {
  return "mapObject" in o;
}

export const mapObjectRemove = createAction(
  "map/object/remove",
  (removal: TokenRemoval | OtherMapObjectRemoval) => {
    return {
      payload: {
        mapId: removal.mapId,
        mapObjectId: isTokenRemoval(removal)
          ? removal.mapObject.id
          : removal.mapObjectId,
        removeTemplateId:
          isTokenRemoval(removal) && removal.relatedCharacter.localToMap
            ? removal.relatedCharacter.id
            : null,
      },
    };
  }
);

////////////////////////////////////////////////////////////////////////////////
// PrivateChats
////////////////////////////////////////////////////////////////////////////////

export const privateChatAdd = createAction(
  "privateChat/add",
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
        messages: EMPTY_ENTITY_COLLECTION,
      },
    };
  }
);

export const privateChatUpdate =
  createAction<Update<Omit<RRPrivateChat, "messages">>>("privateChat/update");

export const privateChatRemove =
  createAction<RRPrivateChat["id"]>("privateChat/remove");

export const privateChatMessageAdd = createAction(
  "privateChat/message/add",
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
  "privateChat/message/update",
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
  "logEntry/message/add",
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

export const logEntryAchievementAdd = createAction(
  "logEntry/achievement/add",
  (
    logEntry: Omit<RRLogEntryAchievement, "id" | "type" | "timestamp">
  ): { payload: RRLogEntryAchievement } => ({
    payload: {
      id: rrid<RRLogEntryAchievement>(),
      type: "achievement",
      timestamp: timestamp(),
      ...logEntry,
    },
  })
);

export const logEntryDiceRollAdd = createAction(
  "logEntry/diceRoll/add",
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

export const logEntryRemove = createAction<RRLogEntry["id"]>("logEntry/remove");

////////////////////////////////////////////////////////////////////////////////
// InitiativeTracker
////////////////////////////////////////////////////////////////////////////////

export const initiativeTrackerSetVisible = createAction<
  InitiativeTrackerSyncedState["visible"]
>("initiativeTracker/visible");

export const initiativeTrackerSetCurrentEntry = createAction<
  InitiativeTrackerSyncedState["currentEntryId"]
>("initiativeTracker/currentEntryId");

export const initiativeTrackerEntryCharacterAdd = createAction(
  "initiativeTracker/entry/character/add",
  (
    initiativeTrackerEntry: Omit<
      RRInitiativeTrackerEntryCharacter,
      "id" | "type"
    >
  ): { payload: RRInitiativeTrackerEntryCharacter } => ({
    payload: {
      id: rrid<RRInitiativeTrackerEntryCharacter>(),
      type: "character",
      ...initiativeTrackerEntry,
    },
  })
);

export const initiativeTrackerEntryLairActionAdd = createAction(
  "initiativeTracker/entry/lairAction/add",
  (
    initiativeTrackerEntry: Omit<
      RRInitiativeTrackerEntryLairAction,
      "id" | "type"
    >
  ): { payload: RRInitiativeTrackerEntryLairAction } => ({
    payload: {
      id: rrid<RRInitiativeTrackerEntryLairAction>(),
      type: "lairAction",
      ...initiativeTrackerEntry,
    },
  })
);

export const initiativeTrackerEntryCharacterUpdate = createAction<
  Update<RRInitiativeTrackerEntryCharacter>
>("initiativetracker/entry/character/update");

export const initiativeTrackerEntryLairActionUpdate = createAction<
  Update<RRInitiativeTrackerEntryLairAction>
>("initiativetracker/entry/lairaction/update");

export const initiativeTrackerEntryRemove = createAction<
  RRInitiativeTrackerEntry["id"]
>("initiativeTracker/entry/remove");

////////////////////////////////////////////////////////////////////////////////
// Ephemeral state
////////////////////////////////////////////////////////////////////////////////

export const ephemeralPlayerAdd = createAction<EphemeralPlayer>(
  "ephemeral/player/add"
);

export const ephemeralPlayerUpdate = createAction<Update<EphemeralPlayer>>(
  "ephemeral/player/update"
);

export const ephemeralPlayerRemove = createAction<EphemeralPlayer["id"]>(
  "ephemeral/player/remove"
);

export const ephemeralMusicAdd = createAction<RRActiveSongOrSoundSet>(
  "ephemeral/music/add"
);

export const ephemeralMusicUpdate = createAction<
  Update<RRActiveSongOrSoundSet>
>("ephemeral/music/update");

export const ephemeralMusicRemove = createAction<RRActiveSongOrSoundSet["id"]>(
  "ephemeral/music/remove"
);

////////////////////////////////////////////////////////////////////////////////
// Asset state
////////////////////////////////////////////////////////////////////////////////

export const assetSongAdd = createAction(
  "asset/song/add",
  (asset: Omit<RRAssetSong, "id">): { payload: RRAssetSong } => ({
    payload: { id: rrid<RRAssetSong>(), ...asset },
  })
);

export const assetImageAdd = createAction(
  "asset/image/add",
  (asset: Omit<RRAssetImage, "id">): { payload: RRAssetImage } => ({
    payload: { id: rrid<RRAssetImage>(), ...asset },
  })
);

export const assetSongUpdate =
  createAction<Update<RRAssetSong>>("asset/song/update");

export const assetImageUpdate =
  createAction<Update<RRAssetImage>>("asset/image/update");

export const assetRemove = createAction<RRAsset["id"]>("asset/remove");

////////////////////////////////////////////////////////////////////////////////
// Sound Sets
////////////////////////////////////////////////////////////////////////////////

export const soundSetAdd = createAction(
  "soundSet/add",
  (soundSet: Omit<RRSoundSet, "id">): { payload: RRSoundSet } => ({
    payload: { id: rrid<RRSoundSet>(), ...soundSet },
  })
);

export const soundSetUpdate =
  createAction<Update<RRSoundSet>>("soundSet/update");

export const soundSetRemove = createAction<RRSoundSet["id"]>("soundSet/remove");

export const soundSetPlaylistAdd = createAction(
  "soundSet/playlist/add",
  (
    soundSetId: RRSoundSet["id"],
    playlist: Omit<RRPlaylist, "id">
  ): { payload: { soundSetId: RRSoundSet["id"]; playlist: RRPlaylist } } => ({
    payload: { soundSetId, playlist: { id: rrid<RRPlaylist>(), ...playlist } },
  })
);

export const soundSetPlaylistUpdate = createAction<{
  soundSetId: RRSoundSet["id"];
  update: Update<RRPlaylist>;
}>("soundSet/playlist/update");

export const soundSetPlaylistRemove = createAction<{
  soundSetId: RRSoundSet["id"];
  playlistId: RRPlaylistID;
}>("soundSet/playlist/remove");

export const soundSetPlaylistEntryAdd = createAction(
  "soundSet/playlist/entry/add",
  (
    soundSetId: RRSoundSet["id"],
    playlistId: RRPlaylistID,
    playlistEntry: DistributiveOmit<RRPlaylistEntry, "id">
  ): {
    payload: {
      soundSetId: RRSoundSet["id"];
      playlistId: RRPlaylistID;
      playlistEntry: RRPlaylistEntry;
    };
  } => ({
    payload: {
      soundSetId,
      playlistId,
      playlistEntry: { id: rrid<RRPlaylistEntry>(), ...playlistEntry },
    },
  })
);

export const soundSetPlaylistEntryUpdate = createAction<{
  soundSetId: RRSoundSet["id"];
  playlistId: RRPlaylistID;
  update: Update<RRPlaylistEntry>;
}>("soundSet/playlist/entry/update");

export const soundSetPlaylistEntryMove = createAction<{
  soundSetId: RRSoundSet["id"];
  playlistId: RRPlaylistID;
  playlistEntryId: RRPlaylistEntryID;
  direction: "up" | "down";
}>("soundSet/playlist/entry/move");

export const soundSetPlaylistEntryRemove = createAction<{
  soundSetId: RRSoundSet["id"];
  playlistId: RRPlaylist["id"];
  playlistEntryId: RRPlaylistEntryID;
}>("soundSet/playlist/entry/remove");

////////////////////////////////////////////////////////////////////////////////
// Global settings
////////////////////////////////////////////////////////////////////////////////

export const globalSettingsUpdate = createAction<Partial<RRGlobalSettings>>(
  "globalSettings/update"
);
