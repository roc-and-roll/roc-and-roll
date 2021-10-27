import { rrid } from "../../shared/util";
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
        {
          parts: {
            type: string;
            name?: string;
            proficiency?: number;
            damage?: { modifiers?: [] };
          }[];
        }
      >
    ).forEach((template) => {
      template.parts.forEach((part) => {
        if (part.type === "linkedModifier" && part.name === "proficiency") {
          part.type = "linkedProficiency";
          part.proficiency = 1;
          delete part.name;
        }
        if (part.damage?.modifiers) {
          delete part.damage.modifiers;
        }
      });
    });

    Object.values(
      state.players.entities as Record<
        string,
        {
          diceTemplateCategories: {
            categoryName: string;
            icon: any;
            templates: [];
            id: string;
          }[];
        }
      >
    ).forEach((player) => {
      //TODO Corinna
      player.diceTemplateCategories ??= [
        {
          categoryName: "Templates",
          icon: "book",
          templates: [],
          id: rrid<any>(),
        },
      ];
    });

    Object.values(
      state.diceTemplates.entities as Record<
        string,
        { categoryIndex?: number; playerId?: string }
      >
    ).forEach((diceTemplate) => {
      const player = Object.values(
        state.players.entities as Record<
          string,
          { id: string; diceTemplateCategories: { templates: any[] }[] }
        >
      ).find((player: { id: string }) => player.id === diceTemplate.playerId)!;
      delete diceTemplate.categoryIndex;
      delete diceTemplate.playerId;
      player.diceTemplateCategories[0]!.templates.push(diceTemplate);
    });

    delete state.diceTemplates;

    Object.values(
      state.logEntries.entities as Record<
        string,
        {
          payload: {
            dice?: {
              damageType: { modifiers?: [] };
            }[];
          };
        }
      >
    ).forEach((logEntry) => {
      if (logEntry.payload.dice)
        logEntry.payload.dice.forEach((dice) => {
          delete dice.damageType.modifiers;
        });
    });

    return state;
  };
}
