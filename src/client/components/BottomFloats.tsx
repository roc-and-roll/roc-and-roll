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
          onMouseEnter={() => setDiceTemplatesOpen(true)}
        >
          DICE
        </div>
        <PrivateChatsWrapper />
        <Log />
      </div>

      <DiceTemplates
        onClose={() => setDiceTemplatesOpen(false)}
        open={diceTemplatesOpen}
      />
    </div>
  );
}
