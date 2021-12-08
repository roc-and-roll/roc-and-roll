import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 21;

  migrate = (state: any) => {
    Object.values(
      state.characters.entities as Record<string, { AC: null | number }>
    ).forEach((character) => {
      character.AC ??= null;
    });

    Object.values(
      state.characterTemplates.entities as Record<string, { AC: null | number }>
    ).forEach((character) => {
      character.AC ??= null;
    });

    return state;
  };
}
