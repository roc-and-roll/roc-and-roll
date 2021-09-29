import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 17;

  migrate = (state: any) => {
    Object.values(
      state.characters.entities as Record<string, { stats: any }>
    ).forEach((character) => {
      if (character.stats === undefined) character.stats = {};
    });
    Object.values(
      state.characterTemplates.entities as Record<string, { stats: any }>
    ).forEach((character) => {
      if (character.stats === undefined) character.stats = {};
    });
    return state;
  };
}
