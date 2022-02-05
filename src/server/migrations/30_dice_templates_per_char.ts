/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 30;
  migrate = async (state: any) => {
    Object.values(
      state.characterTemplates.entities as Record<
        string,
        { isTemplate?: boolean; diceTemplateCategories?: any }
      >
    ).forEach((t) => {
      t.isTemplate = true;
      t.diceTemplateCategories ??= [];
    });
    Object.values(
      state.characters.entities as Record<
        string,
        { isTemplate?: boolean; diceTemplateCategories?: any }
      >
    ).forEach((t) => {
      t.isTemplate = false;
      t.diceTemplateCategories ??= [];
    });

    state.characters.entities = {
      ...state.characters.entities,
      ...state.characterTemplates.entities,
    };
    delete state.characterTemplates;

    Object.values(
      state.players.entities as Record<
        string,
        {
          mainCharacterId?: string;
          diceTemplateCategories?: any;
          characterIds?: string[];
        }
      >
    ).forEach((player) => {
      if (player.mainCharacterId) {
        // try to add to main character
        state.characters.entities[
          player.mainCharacterId
        ].diceTemplateCategories = player.diceTemplateCategories;
      } else if (player.characterIds?.length) {
        // no main character? try to add to first character
        state.characters.entities[
          player.characterIds[0]!
        ].diceTemplateCategories = player.diceTemplateCategories;
      }
      // now just delete
      delete player.diceTemplateCategories;
    });

    return state;
  };
}
