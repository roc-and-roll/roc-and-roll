import {
  RRDiceTemplatePart,
  RRMultipleRoll,
  RRDice,
  RRModifier,
  RRCharacter,
} from "../shared/state";
import { assertNever } from "../shared/util";
import { RRDiceTemplate } from "../shared/validation";
import { roll } from "./roll";
import { modifierFromStat } from "./util";

export function evaluateDiceTemplatePart(
  part: RRDiceTemplatePart,
  modified: RRMultipleRoll,
  crit: boolean = false,
  character?: RRCharacter | null
): Array<RRDice | RRModifier> {
  switch (part.type) {
    case "dice": {
      const res = [
        roll({
          ...part,
          // click on none, is advantage --> none
          // click on disadvatage, is none --> disadvantage
          // click on none, is none --> none
          modified: part.faces !== 20 ? "none" : modified,
        }),
      ];
      if (crit) {
        res.push(
          roll({
            ...part,
            modified: part.faces !== 20 ? "none" : modified,
          })
        );
      }
      return res;
    }
    case "linkedModifier":
      return [
        {
          type: "modifier",
          modifier: character?.attributes[part.name] ?? 0,
          damageType: part.damage,
        },
      ];
    case "linkedProficiency":
      return [
        {
          type: "modifier",
          modifier:
            character?.attributes["proficiency"] ?? 0 * part.proficiency,
          damageType: part.damage,
        },
      ];
    case "linkedStat":
      return [
        {
          type: "modifier",
          modifier:
            character?.stats[part.name] === undefined
              ? 0
              : modifierFromStat(character.stats[part.name]!),
          damageType: part.damage,
        },
      ];
    case "modifier":
      return [
        {
          type: "modifier",
          modifier: part.number,
          damageType: part.damage,
        },
      ];
    case "template": {
      // Do not evaluate nested templates, since they are evaluated separately
      // if they are selected.
      return [];
    }
    default:
      assertNever(part);
  }
}

export function getModifierForTemplate(
  template: RRDiceTemplate,
  character?: RRCharacter | null
) {
  let returnValue = 0;

  template.parts.map((part) => {
    if (part.type === "modifier") returnValue += part.number;
    else if (character) {
      if (part.type === "linkedProficiency")
        returnValue +=
          part.proficiency * (character.attributes["proficiency"] ?? 0);
      else if (part.type === "linkedStat") {
        if (
          character.stats[part.name] === null ||
          character.stats[part.name] === undefined
        )
          return;
        returnValue += modifierFromStat(character.stats[part.name]!);
      }
    }
  });
  return returnValue;
}
