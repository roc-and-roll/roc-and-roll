import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 10;
  migrate = (state: any) => {
    state.soundSets = {
      entities: {},
      ids: [],
    };
    delete state.ephemeral.activeSongs;
    state.ephemeral.activeMusic = {
      entities: {},
      ids: [],
    };

    return state;
  };
}
