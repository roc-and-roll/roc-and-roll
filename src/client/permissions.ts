import {
  RRMapObject,
  RRPlayer,
  RRCharacter,
  RRPlayerID,
} from "../shared/state";

export const canControlToken = (
  character: RRCharacter,
  player: Pick<RRPlayer, "id" | "isGM" | "characterIds">
) => {
  return player.isGM || player.characterIds.includes(character.id);
};

export const canControlMapObject = (
  object: RRMapObject,
  player: Pick<RRPlayer, "id" | "isGM">
) => {
  return object.playerId === player.id || player.isGM;
};

export const canViewTokenOnMap = (
  character: RRCharacter,
  player: Pick<RRPlayer, "id" | "isGM" | "characterIds">
) => {
  return (
    character.visibility === "everyone" || canControlToken(character, player)
  );
};

export const canViewObjectOnMap = (
  object: RRMapObject,
  id: RRPlayerID,
  isGM: boolean
) => {
  return (
    object.type === "token" ||
    object.visibility === "everyone" ||
    object.playerId === id ||
    isGM
  );
};
