import React from "react";
import { logEntryDiceRollAdd } from "../../shared/actions";
import { useMyself } from "../myself";
import { useServerDispatch } from "../state";
import useLocalState from "../useLocalState";

export function InitiativeTracker() {
  const [modifier, setModifier, _] = useLocalState("initiative-modifier", "0");
  const dispatch = useServerDispatch();
  const myself = useMyself();

  const roll = () => {
    dispatch(
      logEntryDiceRollAdd({
        silent: false,
        playerId: myself.id,
        payload: {
          dice: [
            { rollType: "initiative", result: 1, die: { faces: 20, count: 1 } },
          ],
        },
      })
    );
  };

  return (
    <>
      <button onClick={roll}>Roll Initiative</button>
      <input value={modifier} onChange={(e) => setModifier(e.target.value)} />
    </>
  );
}
