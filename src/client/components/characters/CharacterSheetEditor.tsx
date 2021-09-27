import { faMinusSquare, faPlusSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useState } from "react";
import {
  characterTemplateUpdate,
  characterUpdate,
} from "../../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../../shared/constants";
import { characterAttributeNames, RRCharacter } from "../../../shared/state";
import { useServerDispatch } from "../../state";
import { SmartIntegerInput } from "../ui/TextInput";

export const CharacterSheetEditor = React.memo<{
  character: RRCharacter;
  isTemplate: boolean | undefined;
}>(function CharacterSheetEditor({ character, isTemplate }) {
  const dispatch = useServerDispatch();
  const updateFunc = isTemplate ? characterTemplateUpdate : characterUpdate;

  return (
    <div>
      <div style={{ display: "flex" }}>
        <StatEditor
          name={"STR"}
          character={character}
          isTemplate={isTemplate}
        />
        <StatEditor
          name={"DEX"}
          character={character}
          isTemplate={isTemplate}
        />
        <StatEditor
          name={"CON"}
          character={character}
          isTemplate={isTemplate}
        />
      </div>
      <div style={{ display: "flex" }}>
        <StatEditor
          name={"WIS"}
          character={character}
          isTemplate={isTemplate}
        />
        <StatEditor
          name={"INT"}
          character={character}
          isTemplate={isTemplate}
        />
        <StatEditor
          name={"CHA"}
          character={character}
          isTemplate={isTemplate}
        />
      </div>
      <div className="character-editor-attributes">
        {characterAttributeNames.map((attributeName) => (
          <AttributeEditor
            key={attributeName}
            value={character.attributes[attributeName] ?? null}
            label={attributeName}
            onChange={(newValue) =>
              dispatch((state) => {
                const oldAttributes = (
                  isTemplate ? state.characterTemplates : state.characters
                ).entities[character.id]?.attributes;
                if (!oldAttributes) {
                  return [];
                }
                return {
                  actions: [
                    updateFunc({
                      id: character.id,
                      changes: {
                        attributes: {
                          ...oldAttributes,
                          [attributeName]: newValue,
                        },
                      },
                    }),
                  ],
                  optimisticKey: "attributes",
                  syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
                };
              })
            }
          />
        ))}
      </div>
    </div>
  );
});

function StatEditor({
  name,
  character,
  isTemplate,
}: {
  name: string;
  character: RRCharacter;
  isTemplate: boolean | undefined;
}) {
  const [value, setValue] = useState(character.stats[name] ?? null);

  const dispatch = useServerDispatch();
  const updateFunc = isTemplate ? characterTemplateUpdate : characterUpdate;

  function modifier(stat: number) {
    return Math.floor((stat - 10) / 2);
  }

  function updateValue(newValue: number | null) {
    dispatch((state) => {
      const oldStats = (
        isTemplate ? state.characterTemplates : state.characters
      ).entities[character.id]?.stats;
      if (!oldStats) {
        return [];
      }
      return {
        actions: [
          updateFunc({
            id: character.id,
            changes: {
              stats: {
                ...oldStats,
                [name]: newValue,
              },
            },
          }),
        ],
        optimisticKey: "stats",
        syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
      };
    });
    setValue(newValue);
  }

  return (
    <div className={"stat-editor"}>
      <p>{name}</p>
      <p style={{ fontSize: "24px" }}>
        {value === null
          ? "-"
          : modifier(value) >= 1
          ? `+${modifier(value)}`
          : modifier(value)}
      </p>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div onClick={() => updateValue((value ?? 0) - 1)}>
          <FontAwesomeIcon
            fixedWidth
            className="stat-change-icons"
            icon={faMinusSquare}
          ></FontAwesomeIcon>
        </div>
        <input
          className="stat-input"
          value={character.stats[name] ?? 0}
          onChange={(e) => updateValue(parseInt(e.target.value) || null)}
        />
        <div onClick={() => updateValue((value ?? 0) + 1)}>
          <FontAwesomeIcon
            fixedWidth
            className="stat-change-icons"
            icon={faPlusSquare}
          ></FontAwesomeIcon>
        </div>
      </div>
    </div>
  );
}

function AttributeEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (newValue: number | null) => void;
}) {
  return (
    <div className="character-editor-attribute">
      <label>
        <div className="character-editor-attribute-label">{label}</div>
        <SmartIntegerInput
          placeholder="Mod ..."
          value={value}
          nullable
          onChange={(value) => onChange(value)}
        />
      </label>
    </div>
  );
}
