import React, { useState } from "react";
import { logEntryDiceRollAdd } from "../../../shared/actions";
import { useServerDispatch } from "../../state";
import { parseDiceStringAndRoll } from "../../dice-rolling/roll";
import { parseDiceStringGetSyntaxError } from "../../dice-rolling/grammar";
import { Button } from "../ui/Button";
import { useMyProps } from "../../myself";

export function DiceInput() {
  const [text, setText] = useState("");
  // We want to only show a possible syntax error to the user after they press
  // enter or blur the input field, and not while they are typing. This state
  // variable tracks that.
  const [showError, setShowError] = useState(false);
  const [syntaxError, setSyntaxError] = useState<string | null>(null);

  const myself = useMyProps("id");
  const dispatch = useServerDispatch();

  const doRoll = () => {
    const diceRollTree = parseDiceStringAndRoll(text);

    dispatch(
      logEntryDiceRollAdd({
        silent: false,
        playerId: myself.id,
        payload: {
          diceRollTree,
          rollType: null,
          rollName: null,
          tooltip: null,
        },
      })
    );
    setText("");
  };

  return (
    <div className="dice-input">
      <div className="input-row">
        <input
          value={text}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              setShowError(!!syntaxError);
              if (!syntaxError) {
                doRoll();
              }
            }
          }}
          onChange={({ target: { value } }) => {
            const error = parseDiceStringGetSyntaxError(value);
            setText(value);
            setSyntaxError(error?.message ?? null);
          }}
          onBlur={() => setShowError(!!syntaxError)}
          type="text"
        />
        <Button onClick={doRoll} disabled={!!syntaxError}>
          roll
        </Button>
      </div>
      {syntaxError && showError && (
        <div className="error-row">{syntaxError}</div>
      )}
    </div>
  );
}
