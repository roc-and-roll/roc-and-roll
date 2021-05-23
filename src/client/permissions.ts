import {
  RRMapObject,
  RRPlayer,
  RRCharacter,
  RRPlayerID,
} from "../shared/state";

export const canControlToken = (token: RRCharacter, player: RRPlayer) => {
  return player.isGM || player.characterIds.includes(token.id);
};

export const canControlMapObject = (object: RRMapObject, player: RRPlayer) => {
  return object.playerId === player.id || player.isGM;
};

export const canViewTokenOnMap = (token: RRCharacter, player: RRPlayer) => {
  return token.visibility === "everyone" || canControlToken(token, player);
};

export const canViewObjectOnMap = (
  object: RRMapObject,
  id: RRPlayerID,
  isGM: boolean
) => {
  return object.visibility === "everyone" || object.playerId === id || isGM;
};
