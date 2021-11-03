import { AbstractMigration } from "../migrations";

export default class extends AbstractMigration {
  version = 20;

  migrate = async (state: any) => {
    Object.values(
      state.logEntries.entities as Record<string, { type: any; payload: any }>
    ).forEach((logEntry) => {
      if (logEntry.type === "diceRoll") {
        const oldEntries = logEntry.payload.dice as any[];
        const operands = oldEntries.map((oldEntry) => {
          if (oldEntry.type === "modifier") {
            return {
              type: "num",
              value: oldEntry.modifier,
              damage: oldEntry.damageType,
            };
          }

          if (oldEntry.negated) {
            throw new Error("Not supported");
          }

          return {
            type: "dice",
            count: oldEntry.diceResults.length,
            results: oldEntry.diceResults,
            modified: oldEntry.modified,
            faces: oldEntry.faces,
            damage: oldEntry.damageType,
          };
        });

        delete logEntry.payload.dice;
        logEntry.payload.diceRollTree =
          operands.length === 1
            ? operands[0]
            : {
                type: "term",
                operator: "+",
                operands,
              };
      }
    });

    return state;
  };
}
