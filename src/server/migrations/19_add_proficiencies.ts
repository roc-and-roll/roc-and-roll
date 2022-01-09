/* eslint-disable @typescript-eslint/no-unsafe-argument */
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
      player.diceTemplateCategories ??= [
        {
          categoryName: "Templates 1",
          icon: "fire",
          templates: [],
          id: rrid<any>(),
        },
        {
          categoryName: "Templates 2",
          icon: "scales",
          templates: [],
          id: rrid<any>(),
        },
        {
          categoryName: "Templates 3",
          icon: "wrench",
          templates: [],
          id: rrid<any>(),
        },
        {
          categoryName: "Templates 4",
          icon: "magic",
          templates: [],
          id: rrid<any>(),
        },
        {
          categoryName: "Templates 5",
          icon: "dragon",
          templates: [],
          id: rrid<any>(),
        },
        {
          categoryName: "Templates 6",
          icon: "broom",
          templates: [],
          id: rrid<any>(),
        },
      ];
    });

    const allTemplates = Object.values(
      state.diceTemplates.entities as Record<
        string,
        {
          id: string;
          playerId?: string;
          categoryIndex?: number;
          parts: {
            type: string;
            templateId: string;
            template: any;
          }[];
        }
      >
    );

    const isNestedTemplateOf = (
      topTemplate:
        | {
            id: string;
            playerId?: string;
            categoryIndex?: number;
            parts: { type: string; templateId: string; template?: any }[];
          }
        | undefined,
      childTemplateId: string
    ): boolean =>
      topTemplate?.parts.some(
        (p) =>
          p.type === "template" &&
          (p.templateId === childTemplateId ||
            isNestedTemplateOf(
              allTemplates.find((t) => t.id === p.templateId),
              childTemplateId
            ))
      ) ?? false;

    const isNestedTemplate = (templateId: string) => {
      return allTemplates.some((template) =>
        isNestedTemplateOf(template, templateId)
      );
    };

    const inlineNestedTemplates = (template: {
      parts: {
        type: string;
        template: any;
        templateId?: string;
      }[];
    }) => {
      template.parts = template.parts.filter(
        (p) =>
          p.type !== "template" ||
          !!allTemplates.find((t) => t.id === p.templateId)
      );
      for (const part of template.parts) {
        if (part.type === "template") {
          part.template = allTemplates.find((t) => t.id === part.templateId);
          inlineNestedTemplates(part.template);
          delete part.templateId;
          delete part.template.playerId;
          delete part.template.categoryIndex;
        }
      }
    };

    for (const diceTemplate of allTemplates) {
      if (
        !isNestedTemplate(diceTemplate.id) &&
        diceTemplate.categoryIndex !== -1 &&
        diceTemplate.categoryIndex !== undefined
      ) {
        const player = Object.values(
          state.players.entities as Record<
            string,
            { id: string; diceTemplateCategories: { templates: any[] }[] }
          >
        ).find(
          (player: { id: string }) => player.id === diceTemplate.playerId
        )!;
        delete diceTemplate.playerId;
        player.diceTemplateCategories[
          diceTemplate.categoryIndex
        ]!.templates.push(diceTemplate);
        delete diceTemplate.categoryIndex;

        inlineNestedTemplates(diceTemplate);
      }
    }

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
