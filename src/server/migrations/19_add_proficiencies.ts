import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 19;

  migrate = (state: any) => {
    Object.values(
      state.characters.entities as Record<
        string,
        { skills: any; savingThrows: any }
      >
    ).forEach((character) => {
      character.skills ??= {};
      character.savingThrows ??= {};
    });
    Object.values(
      state.characterTemplates.entities as Record<
        string,
        { skills: any; savingThrows: any }
      >
    ).forEach((character) => {
      character.skills ??= {};
      character.savingThrows ??= {};
    });

    return state;
  };
}
