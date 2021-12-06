import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 21;

  migrate = (state: any) => {
    Object.values(
      state.characters.entities as Record<string, { AC: any }>
    ).forEach((character) => {
      character.AC ??= 0;
    });

    Object.values(
      state.characterTemplates.entities as Record<string, { AC: any }>
    ).forEach((character) => {
      character.AC ??= 0;
    });

    return state;
  };
}
