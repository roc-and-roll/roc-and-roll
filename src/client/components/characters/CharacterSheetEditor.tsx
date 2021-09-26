import {
  faMinus,
  faMinusSquare,
  faPlusSquare,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useState } from "react";
import { RRCharacter } from "../../../shared/state";
import { Button } from "../ui/Button";
import { SmartIntegerInput } from "../ui/TextInput";
import { AttributeEditor } from "./CharacterEditor";

//<AttributeEditor
//label={name}
//value={null}
//onChange={() => {}}
//></AttributeEditor>
export const CharacterSheetEditor = React.memo<{ character: RRCharacter }>(
  function CharacterSheetEditor({ character }) {
    return (
      <div>
        <div style={{ display: "flex" }}>
          <StatEditor name={"STR"} character={character} />
          <StatEditor name={"DEX"} character={character} />
          <StatEditor name={"CON"} character={character} />
        </div>
        <div style={{ display: "flex" }}>
          <StatEditor name={"WIS"} character={character} />
          <StatEditor name={"INT"} character={character} />
          <StatEditor name={"CHA"} character={character} />
        </div>
      </div>
    );
  }
);

function StatEditor({
  name,
  character,
}: {
  name: string;
  character: RRCharacter;
}) {
  const [value, setValue] = useState(character.attributes[name] ?? null);

  function modifier(stat: number) {
    return Math.floor((stat - 10) / 2);
  }

  return (
    <div className={"stat-editor"}>
      <p>{name}</p>
      <p style={{ fontSize: "30px" }}>
        {value === null ? "-" : modifier(value)}
      </p>
      <div style={{ display: "flex" }}>
        <div onClick={() => setValue((value ?? 0) - 1)}>
          <FontAwesomeIcon icon={faMinusSquare}></FontAwesomeIcon>
        </div>
        <SmartIntegerInput
          value={value}
          nullable
          onChange={(value) => setValue(value)}
        />
        <div onClick={() => setValue((value ?? 0) + 1)}>
          <FontAwesomeIcon icon={faPlusSquare}></FontAwesomeIcon>
        </div>
      </div>
    </div>
  );
}
