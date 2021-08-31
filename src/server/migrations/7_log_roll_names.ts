import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 7;
  migrate = (state: any) => {
    Object.values(state.logEntries.entities).forEach((log: any) => {
      if (log.type === "diceRoll") {
        if (log.payload.rollType === "initiative") {
          log.payload.rollName = "Initiative";
        } else {
          log.payload.rollName = null;
        }
      }
    });
    return state;
  };
}
