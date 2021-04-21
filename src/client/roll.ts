import {
  RRMultipleRoll,
  RRLogEntryDiceRoll,
  RRDamageType,
  RRDice,
  RRPlayerID,
} from "../shared/state";

export function rollInitiative(
  mod: number,
  multiple: RRMultipleRoll,
  playerId: RRPlayerID
): Omit<RRLogEntryDiceRoll, "id" | "type" | "timestamp"> {
  return {
    payload: {
      rollType: "initiative",
      parts: [rollD20(multiple), modifier(mod)],
    },
    silent: false,
    playerId,
  };
}

function modifier(modifier: number, damageType: RRDamageType = null) {
  return {
    modifier,
    damageType,
  };
}

function rollD20(multiple: RRMultipleRoll = "none") {
  return roll({
    faces: 20,
    count: multiple == "none" ? 1 : 2,
    modified: multiple,
  });
}

function roll({
  faces,
  count,
  damageType,
  modified,
}: {
  faces: number;
  count: number;
  damageType?: RRDamageType;
  modified: RRMultipleRoll;
}): RRDice {
  const results = Array.from(
    { length: count },
    () => Math.floor(Math.random() * faces) + 1
  );
  return {
    faces,
    modified: modified,
    diceResults: results,
    damageType: damageType ?? null,
  };
}
