import { GRID_SIZE } from "../../../shared/constants";
import {
  byId,
  EntityCollection,
  RRMapObject,
  RRToken,
} from "../../../shared/state";
import { pointAdd, pointScale, makePoint } from "../../point";

export const mapObjectCenter = (
  object: RRMapObject,
  tokens: EntityCollection<RRToken>
) => {
  const size = mapObjectSize(object, tokens);
  return pointAdd(object.position, pointScale(size, 0.5));
};

export const mapObjectSize = (
  object: RRMapObject,
  tokens: EntityCollection<RRToken>
) => {
  let size = makePoint(GRID_SIZE);
  if (object.type === "token") {
    const token = byId(tokens.entities, object.tokenId)!;
    size = pointScale(size, token.scale);
  }
  return size;
};
