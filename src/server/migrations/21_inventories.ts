import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 21;

  migrate = async (state: any) => {
    Object.values(
      state.players.entities as Record<string, { inventoryIds: any }>
    ).forEach((player) => {
      player.inventoryIds = [];
    });

    state.inventories = {
      entities: {},
      ids: [],
    };

    return state;
  };
}
