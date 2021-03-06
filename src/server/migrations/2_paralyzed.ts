import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 2;
  migrate = (state: any) => {
    ["characters", "characterTemplates"].forEach((key) =>
      Object.values(state[key].entities as { conditions: string[] }[]).forEach(
        (character) => {
          character.conditions = character.conditions.map((condition) =>
            // cSpell:disable-next-line
            condition === "paralysed" ? "paralyzed" : condition
          );
        }
      )
    );
    return state;
  };
}
