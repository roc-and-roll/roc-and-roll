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
import { RRDiceTemplate, RRDiceTemplateCategory } from "./validation";

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

export const playerUpdateAddCharacterId = createAction<{
  id: RRPlayerID;
  characterId: RRCharacterID;
}>("player/update/characterid");

export const playerAddDiceTemplateCategory = createAction<{
  id: RRPlayerID;
  category: RRDiceTemplateCategory;
}>("player/diceTemplateCategories/add");

export const playerUpdateDiceTemplateCategory = createAction<{
  id: RRPlayerID;
  category: Update<RRDiceTemplateCategory>;
}>("player/diceTemplateCategories/update");

export const playerDeleteDiceTemplateCategory = createAction<{
  id: RRPlayerID;
  categoryId: RRDiceTemplateCategoryID;
}>("player/diceTemplateCategories/delete");

export const playerRemoveDiceTemplate = createAction<{
  id: RRPlayerID;
  categoryId: RRDiceTemplateCategoryID;
  templateId: RRDiceTemplateID;
}>("player/diceTemplateCategories/template/remove");

export const playerUpdateDiceTemplate = createAction<{
  id: RRPlayerID;
  categoryId: RRDiceTemplateCategoryID;
  template: Update<RRDiceTemplate>;
}>("player/diceTemplateCategories/template/update");

export const playerUpdateDiceTemplatePart = createAction<{
  id: RRPlayerID;
  categoryId: RRDiceTemplateCategoryID;
  templateId: RRDiceTemplateID;
  part: Update<RRDiceTemplatePart>;
}>("player/diceTemplateCategories/template/part/update");

export const playerAddDiceTemplatePart = createAction<{
  id: RRPlayerID;
  categoryId: RRDiceTemplateCategoryID;
  templateId: RRDiceTemplateID;
  part: RRDiceTemplatePart;
}>("player/diceTemplateCategories/template/part/add");

export const playerRemoveDiceTemplatePart = createAction<{
  id: RRPlayerID;
  categoryId: RRDiceTemplateCategoryID;
  templateId: RRDiceTemplateID;
  partId: RRDiceTemplatePartID;
}>("player/diceTemplateCategories/template/part/remove");

export const playerAddDiceTemplate = createAction<{
  id: RRPlayerID;
  categoryId: RRDiceTemplateCategoryID;
  template: RRDiceTemplate;
}>("player/diceTemplateCategories/template/add");

export const playerUpdateAddFavoritedAssetId = createAction<{
  id: RRPlayerID;
  assetId: RRAssetID;
}>("player/update/assetid/add");

export const playerUpdateRemoveFavoritedAssetId = createAction<{
  id: RRPlayerID;
  assetId: RRAssetID;
}>("player/update/assetid/remove");

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

////////////////////////////////////////////////////////////////////////////////
// Character Templates
////////////////////////////////////////////////////////////////////////////////

export const characterTemplateAdd = createAction(
  "characterTemplate/add",
  (character: Omit<RRCharacter, "id">): { payload: RRCharacter } => ({
    payload: { id: rrid<RRCharacter>(), ...character },
  })
);

export const characterTemplateUpdate = createAction<Update<RRCharacter>>(
  "characterTemplate/update"
);

export const characterTemplateRemove = createAction<RRCharacter["id"]>(
  "characterTemplate/remove"
);

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
        messages: EMPTY_ENTITY_COLLECTION,
      },
    };
  }
);

export const privateChatUpdate =
  createAction<Update<Omit<RRPrivateChat, "messages">>>("privatechat/update");

export const privateChatRemove =
  createAction<RRPrivateChat["id"]>("privatechat/remove");

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

export const logEntryAchievementAdd = createAction(
  "logentry/achievement/add",
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

export const initiativeTrackerSetCurrentEntry = createAction<
  InitiativeTrackerSyncedState["currentEntryId"]
>("initiativeTracker/currentEntryId");

export const initiativeTrackerEntryCharacterAdd = createAction(
  "initiativetracker/entry/character/add",
  (
    initiativetrackerEntry: Omit<
      RRInitiativeTrackerEntryCharacter,
      "id" | "type"
    >
  ): { payload: RRInitiativeTrackerEntryCharacter } => ({
    payload: {
      id: rrid<RRInitiativeTrackerEntryCharacter>(),
      type: "character",
      ...initiativetrackerEntry,
    },
  })
);

export const initiativeTrackerEntryLairActionAdd = createAction(
  "initiativetracker/entry/lairaction/add",
  (
    initiativetrackerEntry: Omit<
      RRInitiativeTrackerEntryLairAction,
      "id" | "type"
    >
  ): { payload: RRInitiativeTrackerEntryLairAction } => ({
    payload: {
      id: rrid<RRInitiativeTrackerEntryLairAction>(),
      type: "lairAction",
      ...initiativetrackerEntry,
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
>("initiativetracker/entry/remove");

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
  "globalsettings/update"
);
