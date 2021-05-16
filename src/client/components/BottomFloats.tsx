import React, { useState } from "react";
import { DiceTemplates } from "./DiceTemplates";
import { Log } from "./Log";
import { PrivateChatsWrapper } from "./privateChat/PrivateChatsWrapper";

export function BottomFloats() {
  const [diceTemplatesOpen, setDiceTemplatesOpen] = useState(false);

  return (
    <div className="bottom-floats-wrapper">
      <div className="bottom-floats-upper">
        <div
          className="dice-template-opener"
          onClick={() => setDiceTemplatesOpen((o) => !o)}
        >
          DICE
        </div>
        <PrivateChatsWrapper />
        <Log />
      </div>

      <DiceTemplates open={diceTemplatesOpen} />
    </div>
  );
}
