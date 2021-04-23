import React, { useState } from "react";
import { logEntryDiceRollAdd } from "../../shared/actions";
import { RRDice, RRModifier } from "../../shared/state";
import { useMyself } from "../myself";
import { useServerDispatch } from "../state";
import { roll } from "../roll";
import { Button } from "./ui/Button";

export function DiceInput() {
  const [text, setText] = useState("");
  const myself = useMyself();
  const dispatch = useServerDispatch();

  const doRoll = () => {
    const regex = /(^| *[+-] *)(?:(\d*)d(\d+)|(\d+))/g;
    const dice = [...text.matchAll(regex)].map((array): RRDice | RRModifier => {
      const negated = array[1]?.trim() === "-";
      if (array[2] !== undefined && array[3] !== undefined) {
        // die
        const faces = parseInt(array[3]);
        const count = array[2] === "" ? 1 : parseInt(array[2]);
        return roll({
          count,
          faces,
          modified: "none",
          negated,
        });
      } else if (array[4]) {
        // mod
        const modifier = parseInt(array[4]) * (negated ? -1 : 1);
        return {
          type: "modifier",
          damageType: null,
          modifier,
        };
      }
      throw new Error();
    });

    if (dice.length) {
      dispatch(
        logEntryDiceRollAdd({
          silent: false,
          playerId: myself.id,
          payload: { dice, rollType: null },
        })
      );
      setText("");
    } else {
      alert("Please follow the regex: " + regex.toString());
    }
  };

  return (
    <>
      <input
        value={text}
        onKeyPress={(e) => e.key === "Enter" && doRoll()}
        onChange={(evt) => setText(evt.target.value)}
        type="text"
      />
      <Button onClick={doRoll}>roll</Button>
    </>
  );
}
