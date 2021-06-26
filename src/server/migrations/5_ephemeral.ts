import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 5;
  migrate = (state: any) => {
    delete state.ephermal;
    state.ephemeral = {
      players: { ids: [], entities: {} },
      activeSongs: { ids: [], entities: {} },
    };
    return state;
  };
}
