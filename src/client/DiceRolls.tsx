import React from "react";
import { useServerActionDispatch, useServerState } from "./State";

export function DiceRolls() {
  const rolls = useServerState((state) => state.diceRolls.diceRolls);
  const dispatch = useServerActionDispatch();

  return (
    <>
      <button
        onClick={() => {
          const size = prompt("Enter dice number (4, 6, 20, ...)");
          dispatch({ type: "diceRolls/rollDice", payload: size });
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
