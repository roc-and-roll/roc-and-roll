import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 25;

  migrate = (state: any) => {
    Object.values(
      state.characters.entities as Record<string, { limitedUseSkills: any }>
    ).forEach((character) => (character.limitedUseSkills ??= []));

    Object.values(
      state.characterTemplates.entities as Record<
        string,
        { limitedUseSkills: any }
      >
    ).forEach((character) => (character.limitedUseSkills ??= []));

    return state;
  };
}
