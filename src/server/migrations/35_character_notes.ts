import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 35;

  migrate = (state: any) => {
    Object.values(
      state.characters.entities as Record<string, { notes: string }>
    ).forEach((character) => (character.notes ??= ""));

    return state;
  };
}
