import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 23;

  migrate = (state: any) => {
    Object.values(
      state.characters.entities as Record<
        string,
        { spellSaveDC: null | number }
      >
    ).forEach((character) => {
      character.spellSaveDC ??= null;
    });

    Object.values(
      state.characterTemplates.entities as Record<
        string,
        { spellSaveDC: null | number }
      >
    ).forEach((character) => {
      character.spellSaveDC ??= null;
    });

    return state;
  };
}
