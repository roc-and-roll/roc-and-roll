import { RRMapObject, RRPlayer, RRCharacter } from "../shared/state";

export const canControlToken = (token: RRCharacter, player: RRPlayer) => {
  return player.isGM || player.characterIds.includes(token.id);
};

export const canControlMapObject = (object: RRMapObject, player: RRPlayer) => {
  return object.playerId === player.id || player.isGM;
};

export const canViewTokenOnMap = (token: RRCharacter, player: RRPlayer) => {
  return token.visibility === "everyone" || canControlToken(token, player);
};
