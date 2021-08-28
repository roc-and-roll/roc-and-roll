import { GRID_SIZE } from "../../../shared/constants";
import {
  EntityCollection,
  RRMapObject,
  RRCharacter,
} from "../../../shared/state";
import { pointAdd, pointScale, makePoint } from "../../../shared/point";

export const mapObjectCenter = (
  object: RRMapObject,
  characters: EntityCollection<RRCharacter>
) => {
  const size = mapObjectSize(object, characters);
  return pointAdd(object.position, pointScale(size, 0.5));
};

export const mapObjectSize = (
  object: RRMapObject,
  characters: EntityCollection<RRCharacter>
) => {
  let size = makePoint(GRID_SIZE);
  if (object.type === "token") {
    const character = characters.entities[object.characterId];
    if (character) {
      size = pointScale(size, character.scale);
    }
  }
  return size;
};
