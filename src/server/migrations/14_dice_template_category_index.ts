import { entries } from "../../shared/state";
import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 14;

  migrate = (state: any) => {
    entries(state.diceTemplates).forEach((diceTemplate: any) => {
      diceTemplate.categoryIndex = 0;
    });
    return state;
  };
}
