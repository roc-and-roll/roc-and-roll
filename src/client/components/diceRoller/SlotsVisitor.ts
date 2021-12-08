import {
  DRTPartNum,
  DRTPartDice,
  DRTPartTerm,
  DRTPartParens,
  DRTPartNegated,
  RRDamageType,
} from "../../../shared/dice-roll-tree-types-and-validation";
import { colorForDamageType } from "../../../shared/state";
import { DRTVisitor } from "../../dice-rolling/grammar";

interface DisplayPart {
  damageType: RRDamageType;
}
interface DisplayModifier extends DisplayPart {
  type: "modifier";
  modifier: number;
}
interface DisplayDie extends DisplayPart {
  type: "die";
  faces: number;
  result: number;
  used: boolean;
  color: string;
}
interface DisplayWeirdDie extends DisplayPart {
  type: "weirdDie";
  faces: number;
  result: number;
  used: boolean;
  color: string;
}

export type RollSlots = (DisplayDie | DisplayModifier | DisplayWeirdDie)[];

export class SlotsVisitor extends DRTVisitor<RollSlots, true, boolean> {
  protected override visitNum(
    expression: DRTPartNum,
    negated?: boolean
  ): RollSlots {
    return [
      {
        type: "modifier",
        modifier: (negated ? -1 : 1) * expression.value,
        damageType: expression.damage,
      },
    ];
  }

  protected override visitDice(expression: DRTPartDice<true>): RollSlots {
    return expression.results.map((result) => ({
      type: [4, 6, 8, 10, 12, 20].includes(expression.faces)
        ? "die"
        : "weirdDie",
      damageType: expression.damage,
      faces: expression.faces,
      result: result,
      color:
        expression.faces !== 20
          ? colorForDamageType(expression.damage.type)
          : result === 1
          ? "darkred"
          : result === 20
          ? "green"
          : "orange",
      used:
        expression.modified === "none"
          ? true
          : expression.modified === "advantage"
          ? result === Math.max(...expression.results)
          : result === Math.min(...expression.results),
    }));
  }

  protected override visitTerm(
    expression: DRTPartTerm<true>,
    negated?: boolean
  ): RollSlots {
    return expression.operands.flatMap((operand, i) =>
      this.visit(
        operand,
        expression.operator === "-" && i > 0 ? !(negated ?? false) : negated
      )
    );
  }

  protected override visitParens(
    expression: DRTPartParens<true>,
    negated?: boolean
  ): RollSlots {
    return this.visit(expression.inner, negated);
  }

  protected override visitNegated(
    expression: DRTPartNegated<true>,
    negated?: boolean
  ): RollSlots {
    return this.visit(expression.inner, !(negated ?? false));
  }
}
