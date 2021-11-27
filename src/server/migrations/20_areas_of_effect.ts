import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 20;

  migrate = (state: any) => {
    Object.values(
      state.ephemeral.players.entities as Record<string, any>
    ).forEach((ephemeralPlayer) => {
      ephemeralPlayer.area ??= null;
    });

    return state;
  };
}
