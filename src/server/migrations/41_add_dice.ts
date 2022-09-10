/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 41;
  migrate = async (state: any, uploadedFilesDir: string) => {
    Object.values(
      state.characters.entities as Record<string, { dice: any[] }>
    ).forEach((character) => {
      character.dice = [];
    });

    return state;
  };
}
