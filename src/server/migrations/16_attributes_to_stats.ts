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
      character.stats ??= {};
      Object.entries(character.attributes).forEach(([key, value]) => {
        if (key === "proficiency" || key === "initiative") return;
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
      character.stats ??= {};
      Object.entries(character.attributes).forEach(([key, value]) => {
        if (key === "proficiency" || key === "initiative") return;
        character.stats[key] = value * 2 + 10;
        delete character.attributes[key];
      });
    });

    Object.values(
      state.diceTemplates.entities as Record<
        string,
        { parts: { type: string; name: string }[] }
      >
    ).forEach((template) => {
      template.parts.forEach((part) => {
        if (
          part.type === "linkedModifier" &&
          !["proficiency", "initiative"].includes(part.name)
        )
          part.type = "linkedStat";
      });
    });

    return state;
  };
}
