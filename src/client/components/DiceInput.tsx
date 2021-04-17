import React, { useState } from "react";
import { logEntryDiceRollAdd } from "../../shared/actions";
import { useMyself } from "../myself";
import { useServerDispatch } from "../state";

export function DiceInput() {
  const [text, setText] = useState("");
  const myself = useMyself();
  const dispatch = useServerDispatch();

  const roll = () => {
    const regex = /(^| *[+-] *)(?:(\d*)d(\d+)|(\d+))/g;
    const matchArray = [...text.matchAll(regex)];
    const dice = matchArray.map((array) => {
      const sign = array[1]?.trim() === "-" ? -1 : 1;
      if (array[2] !== undefined && array[3] !== undefined) {
        // die
        const faces = parseInt(array[3]);
        const count = array[2] === "" ? 1 : parseInt(array[2]);
        let result = 0;
        for (let i = 1; i <= count; i++) {
          result += Math.floor(Math.random() * faces) + 1;
        }
        result *= sign;
        return {
          damageType: "normal",
          result: result,
          die: {
            faces: faces,
            count: count,
          },
        };
      } else if (array[4]) {
        // mod
        const modifier = parseInt(array[4]) * sign;
        return {
          damageType: "normal",
          result: modifier,
          die: null,
        };
      }
      return {
        damageType: "nothing",
        result: 0,
        die: null,
      };
    });

    if (matchArray.length) {
      dispatch(
        logEntryDiceRollAdd({
          silent: false,
          playerId: myself.id,
          payload: { dice: dice },
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
        onKeyPress={(e) => e.key === "Enter" && roll()}
        onChange={(evt) => setText(evt.target.value)}
        type="text"
      ></input>
      <button onClick={roll}>roll</button>
    </>
  );
}
