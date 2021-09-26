import {
  faBalanceScale,
  faBroom,
  faDiceD20,
  faDragon,
  faFireAlt,
  faMagic,
  faShieldAlt,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import React, { useState } from "react";
import { DiceInput } from "./DiceInput";
import { DiceInterface } from "./DiceInterface";
import { DiceTemplates } from "./DiceTemplates";

export function DicePanel() {
  const [active, setActive] = useState(0);
  const categories = [
    faFireAlt,
    faBalanceScale,
    faShieldAlt,
    faMagic,
    faDragon,
    faBroom,
  ];

  return (
    <div className="tabs">
      <div className="tab-buttons">
        {[faDiceD20, ...categories].map((icon, index) => (
          <div
            key={icon.iconName}
            className={clsx("tab-button", active === index ? "active" : "")}
            onClick={() => setActive(index)}
          >
            <FontAwesomeIcon icon={icon} />
          </div>
        ))}
      </div>

      <div className={clsx("tab", active === 0 ? "active" : "")}>
        <DiceInterface />
        <DiceInput />
      </div>
      {categories.map((icon, index) => (
        <div
          key={icon.iconName}
          className={clsx("tab", active === index + 1 ? "active" : "")}
        >
          <DiceTemplates categoryIndex={index} />
        </div>
      ))}
    </div>
  );
}
