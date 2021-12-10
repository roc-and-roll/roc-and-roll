import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 25;

  migrate = (state: any) => {
    Object.values(
      state.players.entities as Record<
        string,
        { id: string; achievements: any[] }
      >
    ).forEach((player) => {
      player.achievements ??= [];

      Object.values(
        state.logEntries.entities as Record<
          string,
          {
            type: string;
            timestamp: any;
            playerId: string;
            payload: { achievementId: number };
          }
        >
      ).forEach((logEntry) => {
        if (
          logEntry.type === "achievement" &&
          logEntry.playerId === player.id &&
          !player.achievements.find(
            (achievement) => achievement.id === logEntry.payload.achievementId
          )
        ) {
          player.achievements.push({
            id: logEntry.payload.achievementId,
            achievedAt: logEntry.timestamp,
          });
        }
      });
    });

    return state;
  };
}
