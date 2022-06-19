/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 37;
  migrate = async (state: any) => {
    Object.values(
      state.characters.entities as Record<string, { spells: any }>
    ).forEach((character) => (character.spells ??= []));

    return state;
  };
}
