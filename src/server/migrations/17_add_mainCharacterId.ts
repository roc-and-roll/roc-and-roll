import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 17;

  migrate = (state: any) => {
    Object.values(
      state.players.entities as Record<string, { mainCharacterId: any }>
    ).forEach((player) => {
      player.mainCharacterId ??= null;
    });

    return state;
  };
}
