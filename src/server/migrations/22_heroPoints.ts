import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 22;

  migrate = (state: any) => {
    Object.values(
      state.players.entities as Record<string, { hasHeroPoint: boolean }>
    ).forEach((player) => {
      player.hasHeroPoint ??= false;
    });

    return state;
  };
}
