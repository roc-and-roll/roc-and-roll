import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 6;
  migrate = (state: any) => {
    ["characters", "characterTemplates"].forEach((key) =>
      Object.values(state[key].entities as any[]).forEach((character) => {
        character.temporaryHP = 0;
        character.maxHPAdjustment = 0;
      })
    );
    return state;
  };
}
