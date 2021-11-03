import {
  DiceRollTree,
  DRTPartDice,
  DRTPartExpression,
  DRTPartNegated,
  DRTPartNum,
  DRTPartParens,
  DRTPartTerm,
  isDiceRollTree,
} from "../../shared/dice-roll-tree-types-and-validation";
import { assertNever } from "../../shared/util";
import parser from "./grammar.peggy";

export const parseDiceString = (input: string): DiceRollTree<false> => {
  const diceRollTree = parser.parse(input);
  // if (process.env.NODE_ENV !== "production") {
  const errors: string[] = [];
  if (!isDiceRollTree(false)(diceRollTree, { errors })) {
    console.error(diceRollTree);
    console.error(errors);
    throw new Error(
      `The grammar returned an invalid tree. This should never happen.`
    );
  }
  // }

  return diceRollTree;
};

export const parseDiceStringGetSyntaxError = (
  input: string
): InstanceType<typeof parser.SyntaxError> | null => {
  try {
    parser.parse(input);
  } catch (error) {
    if (error instanceof parser.SyntaxError) {
      return error;
    }
    // If any other error occurrs, throw it (should never happen).
    throw error;
  }
  return null;
};

// Base class for dice roll tree visitors that can be used to visit each tree
// node to iteratively create a result T. The second template parameter
// indicates whether the visitor handles a dice roll tree with or without the
// dice already having been rolled.
export abstract class DRTVisitor<T, WithResults extends boolean> {
  public visit(expression: DRTPartExpression<WithResults>): T {
    switch (expression.type) {
      case "num":
        return this.visitNum(expression);
      case "dice":
        return this.visitDice(expression);
      case "term":
        return this.visitTerm(expression);
      case "parens":
        return this.visitParens(expression);
      case "negated":
        return this.visitNegated(expression);
      default:
        assertNever(expression);
    }
  }

  protected abstract visitNum(expression: DRTPartNum): T;
  protected abstract visitDice(expression: DRTPartDice<WithResults>): T;
  protected abstract visitTerm(expression: DRTPartTerm<WithResults>): T;
  protected abstract visitParens(expression: DRTPartParens<WithResults>): T;
  protected abstract visitNegated(expression: DRTPartNegated<WithResults>): T;
}
