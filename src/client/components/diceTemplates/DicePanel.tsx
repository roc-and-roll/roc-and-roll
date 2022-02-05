import React from "react";
import { DiceInput } from "./DiceInput";
import { DiceInterface } from "../DiceInterface";

export const DicePanel = React.memo(function DicePanel() {
  return (
    <div className="p-2">
      <DiceInterface />
      <DiceInput />
    </div>
  );
});
