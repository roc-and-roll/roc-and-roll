import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 27;

  migrate = (state: any) => {
    ["characters", "characterTemplates"].forEach((collection) =>
      Object.values(
        state[collection].entities as Record<
          string,
          { attributes: any; stats: any; skills: any; savingThrows: any }
        >
      ).forEach((character) => {
        character.attributes.initiative ??= null;
        character.attributes.proficiency ??= null;

        character.stats.STR ??= null;
        character.stats.DEX ??= null;
        character.stats.CON ??= null;
        character.stats.INT ??= null;
        character.stats.WIS ??= null;
        character.stats.CHA ??= null;

        character.skills["Athletics"] ??= null;
        character.skills["Acrobatics"] ??= null;
        character.skills["Sleight of Hand"] ??= null;
        character.skills["Stealth"] ??= null;
        character.skills["Arcana"] ??= null;
        character.skills["History"] ??= null;
        character.skills["Investigation"] ??= null;
        character.skills["Nature"] ??= null;
        character.skills["Religion"] ??= null;
        character.skills["Animal Handling"] ??= null;
        character.skills["Insight"] ??= null;
        character.skills["Medicine"] ??= null;
        character.skills["Perception"] ??= null;
        character.skills["Survival"] ??= null;
        character.skills["Deception"] ??= null;
        character.skills["Intimidation"] ??= null;
        character.skills["Performance"] ??= null;
        character.skills["Persuasion"] ??= null;

        character.savingThrows.STR ??= null;
        character.savingThrows.DEX ??= null;
        character.savingThrows.CON ??= null;
        character.savingThrows.INT ??= null;
        character.savingThrows.WIS ??= null;
        character.savingThrows.CHA ??= null;
      })
    );

    return state;
  };
}
