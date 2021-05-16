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
    const regex = /(^| *[+-] *)(?:(\d*)(d|a|i)(\d+)|(\d+))/g;
    const dice = [...text.matchAll(regex)].map(
      ([_, sign, diceCount, die, dieFaces, mod]): RRDice | RRModifier => {
        const negated = sign?.trim() === "-";
        if (diceCount !== undefined && dieFaces !== undefined) {
          // die
          const faces = parseInt(dieFaces);
          const count =
            diceCount === "" ? (die === "d" ? 1 : 2) : parseInt(diceCount);
          return roll({
            count,
            faces,
            modified:
              die === "a" ? "advantage" : die === "i" ? "disadvantage" : "none",
            negated,
            damage: {
              type: null,
              modifiers: [],
            },
          });
        } else if (mod) {
          // mod
          const modifier = parseInt(mod) * (negated ? -1 : 1);
          return {
            type: "modifier",
            damageType: {
              type: null,
              modifiers: [],
            },
            modifier,
          };
        }
        throw new Error();
      }
    );

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
