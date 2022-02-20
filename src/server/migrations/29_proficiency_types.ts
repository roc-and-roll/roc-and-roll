import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 29;

  migrate = (state: any) => {
    Object.values(
      state.characters.entities as Record<
        string,
        { skills: Record<string, any>; savingThrows: Record<string, any> }
      >
    ).forEach((character) => {
      Object.entries(character.skills).forEach(([key, value]) => {
        character.skills[key] =
          value === 0.5
            ? "halfProficient"
            : value === 1
            ? "proficient"
            : value === 2
            ? "doublyProficient"
            : "notProficient";
      });
      Object.entries(character.savingThrows).forEach(([key, value]) => {
        character.savingThrows[key] =
          value === 0.5
            ? "halfProficient"
            : value === 1
            ? "proficient"
            : value === 2
            ? "doublyProficient"
            : "notProficient";
      });
    });

    Object.values(
      state.characterTemplates.entities as Record<
        string,
        { skills: Record<string, any>; savingThrows: Record<string, any> }
      >
    ).forEach((character) => {
      Object.entries(character.skills).forEach(([key, value]) => {
        character.skills[key] =
          value === 0.5
            ? "halfProficient"
            : value === 1
            ? "proficient"
            : value === 2
            ? "doublyProficient"
            : "notProficient";
      });
      Object.entries(character.savingThrows).forEach(([key, value]) => {
        character.savingThrows[key] =
          value === 0.5
            ? "halfProficient"
            : value === 1
            ? "proficient"
            : value === 2
            ? "doublyProficient"
            : "notProficient";
      });
    });

    interface DiceTemplate {
      parts: (
        | {
            type: "linkedProficiency";
            proficiency: string | number;
          }
        | { type: "template"; template: DiceTemplate }
        | { type: "_other" }
      )[];
    }

    const updateTemplate = (d: DiceTemplate) => {
      d.parts.forEach((part) => {
        if (part.type === "linkedProficiency") {
          part.proficiency =
            part.proficiency === 0.5
              ? "halfProficient"
              : part.proficiency === 1
              ? "proficient"
              : part.proficiency === 2
              ? "doublyProficient"
              : "notProficient";
        } else if (part.type === "template") {
          updateTemplate(part.template);
        }
      });
    };

    Object.values(
      state.players.entities as Record<
        string,
        {
          diceTemplateCategories: [
            {
              templates: DiceTemplate[];
            }
          ];
        }
      >
    ).forEach((player) => {
      player.diceTemplateCategories.forEach((category) =>
        category.templates.forEach((template) => updateTemplate(template))
      );
    });

    return state;
  };
}
