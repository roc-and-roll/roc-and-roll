import React, { useState } from "react";
import { logEntryDiceRollAdd } from "../../shared/actions";
import { RRLogEntryDiceRoll } from "../../shared/state";
import { useMyself } from "../myself";
import { useServerDispatch } from "../state";

export function DiceInput() {
  const [text, setText] = useState("");
  const myself = useMyself();
  const dispatch = useServerDispatch();
  return (
    <>
      <input
        value={text}
        onChange={(evt) => setText(evt.target.value)}
        type="text"
      ></input>
      <button
        onClick={() => {
          const regex = /(^| *[+-] *)(?:(\d*)d(\d+)|(\d+))/g;
          const matchArray = [...text.matchAll(regex)];
          const dice = matchArray.map((array) => {
            if (array[2] && array[3]) {
              // die
              return {
                damageType: "normal",
                result: 4, // TODO: vorher
                die: {
                  faces: parseInt(array[3]),
                  count: parseInt(array[2]),
                },
              };
            } else if (array[4]) {
              // mod
              return {
                damageType: "normal",
                result: parseInt(array[4]), // TODO: vorher
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
          } else {
            alert("Please follow the regex: " + regex.toString());
          }
        }}
      >
        roll
      </button>
    </>
  );
}
