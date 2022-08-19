import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 40;

  migrate = (state: any) => {
    Object.values(
      state.characters.entities as Record<
        string,
        { attributes: { level: any } }
      >
    ).forEach((character) => (character.attributes.level ??= null));

    return state;
  };
}
