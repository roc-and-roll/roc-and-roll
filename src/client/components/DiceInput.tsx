import { features } from "node:process";
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
            if (array[2] !== undefined && array[3] !== undefined) {
              // die
              const faces = parseInt(array[3]);
              const count = array[2] === "" ? 1 : parseInt(array[2]);
              let result = 0;
              for (let i = 1; i <= count; i++) {
                result += Math.floor(Math.random() * faces) + 1;
              }
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
