import { DiceRollTree } from "../../shared/dice-roll-tree-types-and-validation";
import { RRDiceTemplate } from "../../shared/validation";
import { RRDiceTemplatePart } from "../../shared/state";
import { rrid } from "../../shared/util";

export function tryConvertDiceRollTreeToDiceTemplateParts(
  diceRollTree: DiceRollTree<false>
): RRDiceTemplate["parts"] | false {
  if (diceRollTree.type !== "term" || diceRollTree.operator !== "+") {
    return false;
  }

  const parts: RRDiceTemplate["parts"] = [];
  for (const operand of diceRollTree.operands) {
    switch (operand.type) {
      case "num":
        parts.push({
          id: rrid<RRDiceTemplatePart>(),
          type: "modifier",
          number: operand.value,
          damage: operand.damage,
        });
        break;
      case "dice":
        parts.push({
          id: rrid<RRDiceTemplatePart>(),
          type: "dice",
          count: operand.count,
          faces: operand.faces,
          modified: operand.modified,
          negated: false,
          damage: operand.damage,
        });
        break;
      default:
        return false;
    }
  }

  return parts;
}
