import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 16;

  migrate = (state: any) => {
    Object.values(
      state.characters.entities as Record<
        string,
        { attributes: Record<string, number>; stats: any }
      >
    ).forEach((character) => {
      Object.entries(character.attributes).forEach(([key, value]) => {
        character.stats ??= {};
        if (key === "profiency" || key === "initiative") return;
        character.stats[key] = value * 2 + 10;
        delete character.attributes[key];
      });
    });
    Object.values(
      state.characterTemplates.entities as Record<
        string,
        { attributes: Record<string, number>; stats: any }
      >
    ).forEach((character) => {
      Object.entries(character.attributes).forEach(([key, value]) => {
        character.stats ??= {};
        if (key === "profiency" || key === "initiative") return;
        character.stats[key] = value * 2 + 10;
        delete character.attributes[key];
      });
    });
    return state;
  };
}
