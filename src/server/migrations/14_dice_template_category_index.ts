import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 14;

  migrate = (state: any) => {
    Object.values(state.diceTemplates.entities).forEach((diceTemplate: any) => {
      diceTemplate.categoryIndex = 0;
    });
    return state;
  };
}
