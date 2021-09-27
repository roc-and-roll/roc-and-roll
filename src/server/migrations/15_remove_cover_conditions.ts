import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 15;

  migrate = (state: any) => {
    Object.values(
      state.characters.entities as Record<string, { conditions: string[] }>
    ).forEach((character) => {
      character.conditions = character.conditions.filter(
        (condition) => !condition.includes("cover")
      );
    });
    return state;
  };
}
