import { RRPlayer, RRToken } from "../shared/state";

export const canControlToken = (token: RRToken, player: RRPlayer) => {
  return player.isGM || player.tokenIds.includes(token.id);
};

export const canViewTokenOnMap = (token: RRToken, player: RRPlayer) => {
  return token.visibility === "everyone" || canControlToken(token, player);
};
