/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 32;
  migrate = async (state: {
    characters: { entities: { id: string }[]; ids: string[] };
  }) => {
    state.characters.ids = Object.values(state.characters.entities).map(
      (e) => e.id
    );
    return state;
  };
}
