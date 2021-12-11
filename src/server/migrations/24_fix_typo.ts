import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 24;

  // cSpell:disable
  migrate = (state: any) => {
    Object.values(
      state.characters.entities as Record<
        string,
        { auras: { visibileWhen?: any; visibleWhen?: any }[] }
      >
    ).forEach((character) => {
      character.auras.forEach((aura) => {
        if (aura.visibileWhen) {
          aura.visibleWhen = aura.visibileWhen;
          delete aura.visibileWhen;
        }
      });
    });

    Object.values(
      state.characterTemplates.entities as Record<
        string,
        { auras: { visibileWhen?: any; visibleWhen?: any }[] }
      >
    ).forEach((character) => {
      character.auras.forEach((aura) => {
        if (aura.visibileWhen) {
          aura.visibleWhen = aura.visibileWhen;
          delete aura.visibileWhen;
        }
      });
    });
    // cSpell:enable

    return state;
  };
}
