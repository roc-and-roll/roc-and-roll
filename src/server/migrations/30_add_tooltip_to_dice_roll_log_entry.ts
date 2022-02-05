/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 30;
  migrate = async (state: any) => {
    Object.values(
      state.logEntries.entities as Record<
        string,
        {
          type: string;
          payload: { tooltip?: any };
        }
      >
    ).map((logEntry) => {
      if (logEntry.type === "diceRoll") logEntry.payload.tooltip ??= null;
    });

    return state;
  };
}
