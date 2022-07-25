/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 39;
  migrate = async (state: any) => {
    Object.values(
      state.characters.entities as Record<
        string,
        { spells: { isRitual: any; alwaysPrepared: any; level: number }[] }
      >
    ).forEach((character) =>
      character.spells.forEach((spell) => {
        spell.isRitual ??= false;
        spell.alwaysPrepared ??= spell.level === 0;
      })
    );
    return state;
  };
}
