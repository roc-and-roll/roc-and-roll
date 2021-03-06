/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 38;

  migrate = async (state: any) => {
    Object.values(
      state.characters.entities as Record<
        string,
        { spells: any[]; currentlyConcentratingOn: any }
      >
    ).forEach((character) => {
      character.spells.forEach((spell) => {
        spell.concentrationRounds ??= 0;
      });

      character.currentlyConcentratingOn ??= null;
    });

    return state;
  };
}
