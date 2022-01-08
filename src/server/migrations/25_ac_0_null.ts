import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 25;

  migrate = (state: any) => {
    Object.values(
      state.characters.entities as Record<string, { AC: null | number }>
    ).forEach((character) => {
      character.AC = character.AC === 0 ? null : character.AC;
    });

    Object.values(
      state.characterTemplates.entities as Record<string, { AC: null | number }>
    ).forEach((character) => {
      character.AC = character.AC === 0 ? null : character.AC;
    });

    return state;
  };
}
