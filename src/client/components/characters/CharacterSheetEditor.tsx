import {
  faAdjust,
  faCircle,
  faMinusSquare,
  faPlusCircle,
  faPlusSquare,
} from "@fortawesome/free-solid-svg-icons";
import { faCircle as faEmptyCircle } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useState } from "react";
import {
  characterTemplateUpdate,
  characterUpdate,
} from "../../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../../shared/constants";
import {
  characterAttributeNames,
  characterStatNames,
  proficiencyValues,
  RRCharacter,
  skillMap,
  skillNames,
} from "../../../shared/state";
import { useServerDispatch } from "../../state";
import { Button } from "../ui/Button";
import { SmartIntegerInput } from "../ui/TextInput";
import { getProficiencyValueString, modifierFromStat } from "../../util";

export const CharacterSheetEditor = React.memo<{
  character: RRCharacter;
  isTemplate: boolean | undefined;
}>(function CharacterSheetEditor({ character, isTemplate }) {
  const dispatch = useServerDispatch();
  const updateFunc = isTemplate ? characterTemplateUpdate : characterUpdate;
  const [showProficiencyEditor, setShowProficiencyEditor] = useState(false);

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
          name={"INT"}
          character={character}
          isTemplate={isTemplate}
        />
        <StatEditor
          name={"WIS"}
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
                  optimisticKey: `attributes/${attributeName}`,
                  syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
                };
              })
            }
          />
        ))}
        <AttributeEditor
          value={character.ac}
          label={"AC"}
          minimum={0}
          onChange={(newAC) => {
            dispatch(() => ({
              actions: [
                updateFunc({
                  id: character.id,
                  changes: { ac: newAC },
                }),
              ],
              optimisticKey: `ac`,
              syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
            }));
          }}
        />
        <AttributeEditor
          value={character.spellSaveDC}
          label={"Spell Save DC"}
          minimum={0}
          onChange={(newDC) => {
            dispatch(() => ({
              actions: [
                updateFunc({
                  id: character.id,
                  changes: { spellSaveDC: newDC },
                }),
              ],
              optimisticKey: `spellSaveDC`,
              syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
            }));
          }}
        />
      </div>
      <Button onClick={() => setShowProficiencyEditor(!showProficiencyEditor)}>
        Edit Proficiencies
      </Button>
      {showProficiencyEditor && (
        <ProficiencyEditor character={character} isTemplate={isTemplate} />
      )}
    </div>
  );
});

function ProficiencyEditor({
  character,
  isTemplate,
}: {
  character: RRCharacter;
  isTemplate: boolean | undefined;
}) {
  const dispatch = useServerDispatch();
  const updateFunc = isTemplate ? characterTemplateUpdate : characterUpdate;

  function getIcon(proficiency: keyof typeof proficiencyValues | undefined) {
    return proficiency === 0 || proficiency === undefined
      ? faEmptyCircle
      : proficiency === 0.5
      ? faAdjust
      : proficiency === 1
      ? faCircle
      : faPlusCircle;
  }

  function calculateModifierWithProficiency(
    baseStat: typeof characterStatNames[number],
    proficiency: typeof proficiencyValues[number] | undefined
  ) {
    return character.stats[baseStat] === null ||
      character.stats[baseStat] === undefined
      ? 0
      : modifierFromStat(character.stats[baseStat]!) +
          Math.floor(
            (character.attributes["proficiency"] ?? 0) * (proficiency ?? 0)
          );
  }

  function changeProficiencyInSavingThrow(
    proficiency: typeof proficiencyValues[number] | undefined,
    stat: typeof characterStatNames[number]
  ) {
    const newValue =
      proficiency === undefined
        ? 0.5
        : proficiencyValues[(proficiencyValues.indexOf(proficiency) + 1) % 4]!;
    dispatch((state) => {
      const oldSavingThrows = (
        isTemplate ? state.characterTemplates : state.characters
      ).entities[character.id]?.savingThrows;
      if (!oldSavingThrows) {
        return [];
      }
      return {
        actions: [
          updateFunc({
            id: character.id,
            changes: {
              savingThrows: {
                ...oldSavingThrows,
                [stat]: newValue,
              },
            },
          }),
        ],
        optimisticKey: `savingThrows/${String(stat)}`,
        syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
      };
    });
  }
  function changeProficiencyInSkill(
    proficiency: typeof proficiencyValues[number] | undefined,
    skill: typeof skillNames[number]
  ) {
    const newValue =
      proficiencyValues[(proficiencyValues.indexOf(proficiency ?? 0) + 1) % 4]!;
    dispatch((state) => {
      const oldSkills = (
        isTemplate ? state.characterTemplates : state.characters
      ).entities[character.id]?.skills;
      if (!oldSkills) {
        return [];
      }
      return {
        actions: [
          updateFunc({
            id: character.id,
            changes: {
              skills: {
                ...oldSkills,
                [skill]: newValue,
              },
            },
          }),
        ],
        optimisticKey: `skills/${String(skill)}`,
        syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
      };
    });
  }

  return (
    <div>
      {characterStatNames.map((stat) => {
        const proficiency: 0 | 0.5 | 1 | 2 | undefined =
          character.savingThrows[stat];
        return (
          <div key={stat} className="proficiencies">
            <Button
              className="button"
              onClick={() => changeProficiencyInSavingThrow(proficiency, stat)}
              title={getProficiencyValueString(proficiency)}
            >
              <FontAwesomeIcon icon={getIcon(proficiency)} />
            </Button>
            <p className="stat">{stat}</p>
            <p>Saving Throw</p>
            <b className="finalModifier">
              {calculateModifierWithProficiency(stat, proficiency)}
            </b>
          </div>
        );
      })}
      <hr />
      {skillNames.map((skill) => {
        const proficiency: typeof proficiencyValues[number] | undefined =
          character.skills[skill];
        const stat = skillMap[skill];
        return (
          <div key={skill} className="proficiencies">
            <Button
              onClick={() => changeProficiencyInSkill(proficiency, skill)}
              title={getProficiencyValueString(proficiency)}
              className="button"
            >
              <FontAwesomeIcon icon={getIcon(proficiency)} />
            </Button>
            <p className="stat">{stat}</p>
            <p>{skill}</p>
            <b className="finalModifier">
              {calculateModifierWithProficiency(stat, proficiency) > 0
                ? "+"
                : ""}
              {calculateModifierWithProficiency(stat, proficiency)}
            </b>
          </div>
        );
      })}
    </div>
  );
}

function StatEditor({
  name,
  character,
  isTemplate,
}: {
  name: string;
  character: RRCharacter;
  isTemplate: boolean | undefined;
}) {
  const dispatch = useServerDispatch();
  const updateFunc = isTemplate ? characterTemplateUpdate : characterUpdate;

  function modifier(stat: number) {
    return Math.floor((stat - 10) / 2);
  }

  function updateValue(newValue: React.SetStateAction<number | null>) {
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
                [name]:
                  typeof newValue === "function"
                    ? newValue(oldStats[name] ?? null)
                    : newValue,
              },
            },
          }),
        ],
        optimisticKey: `stats/${name}`,
        syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
      };
    });
  }

  const value = character.stats[name] ?? null;

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
        <div onClick={() => updateValue((value) => (value ?? 0) - 1)}>
          <FontAwesomeIcon
            fixedWidth
            className="stat-change-icons"
            icon={faMinusSquare}
          ></FontAwesomeIcon>
        </div>
        <SmartIntegerInput
          min={0}
          className="stat-input"
          value={value}
          nullable
          onChange={(value) => updateValue(value)}
        />
        <div onClick={() => updateValue((value) => (value ?? 0) + 1)}>
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
  minimum,
  onChange,
}: {
  label: string;
  value: number | null;
  minimum?: number;
  onChange: (newValue: number | null) => void;
}) {
  return (
    <div className="character-editor-attribute">
      <label>
        <div className="character-editor-attribute-label">{label}</div>
        <SmartIntegerInput
          min={minimum}
          placeholder="Mod ..."
          value={value}
          nullable
          onChange={(value) => onChange(value)}
        />
      </label>
    </div>
  );
}
