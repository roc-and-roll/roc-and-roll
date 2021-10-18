import { defaultCategories } from "../../shared/state";
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

    Object.values(
      state.diceTemplates.entities as Record<
        string,
        { parts: { type: string; name?: string; proficiency?: number }[] }
      >
    ).forEach((template) => {
      template.parts.forEach((part) => {
        if (part.type === "linkedModifier" && part.name === "proficiency") {
          part.type = "linkedProficiency";
          part.proficiency = 1;
          delete part.name;
        }
      });
    });

    Object.values(
      state.players.entities as Record<string, { diceTemplateCategories: any }>
    ).forEach((character) => {
      character.diceTemplateCategories ??= defaultCategories;
    });

    return state;
  };
}
