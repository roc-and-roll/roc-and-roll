/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 33;
  migrate = async (state: any) => {
    Object.values(
      state.logEntries.entities as Record<
        string,
        {
          type: string;
          payload: { characterIds?: any };
        }
      >
    ).map((logEntry) => {
      if (logEntry.type === "diceRoll") logEntry.payload.characterIds ??= null;
    });

    return state;
  };
}
