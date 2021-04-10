import React from "react";
import { useServerActionFunction, useServerState } from "../state";

export function DiceRolls() {
  const rolls = useServerState((state) => state.diceRolls.rolls);
  const { rollDice } = useServerActionFunction();

  return (
    <>
      <button
        onClick={() => {
          const size = prompt("Enter dice number (4, 6, 20, ...)");
          if (size === null) {
            return;
          }
          rollDice(parseInt(size, 10));
        }}
      >
        roll dice
      </button>
      <ul style={{ maxHeight: 200, overflowY: "scroll" }}>
        {rolls.map((roll, idx) => (
          <li key={idx}>{JSON.stringify(roll)}</li>
        ))}
      </ul>
    </>
  );
}
