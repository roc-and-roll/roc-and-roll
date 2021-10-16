import { defaultCategories } from "../../shared/state";
import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 20;

  migrate = (state: any) => {
    Object.values(
      state.players.entities as Record<string, { diceTemplateCategories: any }>
    ).forEach((character) => {
      character.diceTemplateCategories ??= defaultCategories;
    });

    return state;
  };
}
