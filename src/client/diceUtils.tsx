import { DRTPartExpression } from "../shared/dice-roll-tree-types-and-validation";
import {
  RRDiceTemplatePart,
  RRMultipleRoll,
  RRCharacter,
} from "../shared/state";
import { assertNever } from "../shared/util";
import { RRDiceTemplate } from "../shared/validation";
import { roll } from "./dice-rolling/roll";
import { modifierFromStat } from "./util";

export function evaluateDiceTemplatePart(
  part: RRDiceTemplatePart,
  modified: RRMultipleRoll,
  crit: boolean = false,
  character?: Pick<RRCharacter, "stats" | "attributes"> | null
): DRTPartExpression<true>[] {
  switch (part.type) {
    case "dice": {
      const res = [
        roll({
          ...part,
          // click on none, is advantage --> none
          // click on disadvantage, is none --> disadvantage
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
          type: "num",
          value: character?.attributes[part.name] ?? 0,
          damage: part.damage,
        },
      ];
    case "linkedProficiency":
      return [
        {
          type: "num",
          value: character?.attributes["proficiency"] ?? 0 * part.proficiency,
          damage: part.damage,
        },
      ];
    case "linkedStat":
      return [
        {
          type: "num",
          value:
            character?.stats[part.name] === undefined
              ? 0
              : modifierFromStat(character.stats[part.name]!),
          damage: part.damage,
        },
      ];
    case "modifier":
      return [
        {
          type: "num",
          value: part.number,
          damage: part.damage,
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
  character?: Pick<RRCharacter, "stats" | "attributes"> | null
) {
  let returnValue = 0;

  template.parts.map((part) => {
    if (part.type === "modifier") {
      returnValue += part.number;
    } else if (character) {
      if (part.type === "linkedProficiency") {
        returnValue +=
          part.proficiency * (character.attributes["proficiency"] ?? 0);
      } else if (part.type === "linkedStat") {
        if (character.stats[part.name] === null) return;
        returnValue += modifierFromStat(character.stats[part.name]!);
      }
    }
  });
  return returnValue;
}
