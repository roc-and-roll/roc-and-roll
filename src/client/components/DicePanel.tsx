import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import React, { useState } from "react";
import { categoryIcons, iconMap } from "../../shared/state";
import { useMyself } from "../myself";
import { DiceInput } from "./DiceInput";
import { DiceInterface } from "./DiceInterface";
import { DiceTemplates } from "./DiceTemplates";

export const DicePanel = React.memo(function DicePanel() {
  const [active, setActive] = useState(0);
  const myself = useMyself();

  return (
    <div className="tabs">
      <div className="tab-buttons">
        {[
          {
            icon: "d20" as typeof categoryIcons[number],
            categoryName: "Input",
          },
          ...myself.diceTemplateCategories,
        ].map(
          (
            {
              icon,
              categoryName,
            }: { icon: typeof categoryIcons[number]; categoryName: string },
            index
          ) => (
            <div
              key={index}
              className={clsx("tab-button", active === index ? "active" : "")}
              onClick={() => setActive(index)}
              title={categoryName}
            >
              <FontAwesomeIcon icon={iconMap[icon]} fixedWidth />
            </div>
          )
        )}
      </div>

      <div className={clsx("tab", active === 0 ? "active" : "")}>
        <DiceInterface />
        <DiceInput />
      </div>
      {myself.diceTemplateCategories.map((_category, index) => (
        <div
          key={index}
          className={clsx("tab", active === index + 1 ? "active" : "")}
        >
          <DiceTemplates categoryIndex={index} />
        </div>
      ))}
    </div>
  );
});
