import {
  faAdjust,
  faCircle,
  faMinusSquare,
  faPlusCircle,
  faPlusSquare,
  faQuestionCircle,
} from "@fortawesome/free-solid-svg-icons";
import { faCircle as faEmptyCircle } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useState } from "react";
import { characterUpdate } from "../../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../../shared/constants";
import {
  characterAttributeNames,
  characterStatNames,
  proficiencyValues,
  proficiencyValueStrings,
  RRCharacter,
  skillMap,
  skillNames,
} from "../../../shared/state";
import { useServerDispatch } from "../../state";
import { Button } from "../ui/Button";
import { SmartIntegerInput } from "../ui/TextInput";
import { getProficiencyValueString, modifierFromStat } from "../../util";
import { calculateProficiencyBonus } from "../../diceUtils";

export const CharacterSheetEditor = React.memo<{
  character: RRCharacter;
}>(function CharacterSheetEditor({ character }) {
  const dispatch = useServerDispatch();
  const [showProficiencyEditor, setShowProficiencyEditor] = useState(false);

  return (
    <div>
      <div style={{ display: "flex" }}>
        <StatEditor name={"STR"} character={character} />
        <StatEditor name={"DEX"} character={character} />
        <StatEditor name={"CON"} character={character} />
      </div>
      <div style={{ display: "flex" }}>
        <StatEditor name={"INT"} character={character} />
        <StatEditor name={"WIS"} character={character} />
        <StatEditor name={"CHA"} character={character} />
      </div>
      <div className="character-editor-attributes">
        {characterAttributeNames.map((attributeName) => (
          <AttributeEditor
            key={attributeName}
            value={character.attributes[attributeName] ?? null}
            label={attributeName}
            onChange={(newValue) =>
              dispatch((state) => {
                const oldAttributes =
                  state.characters.entities[character.id]?.attributes;
                if (!oldAttributes) {
                  return [];
                }
                return {
                  actions: [
                    characterUpdate({
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
                characterUpdate({
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
                characterUpdate({
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
      {showProficiencyEditor && <ProficiencyEditor character={character} />}
    </div>
  );
});

function ProficiencyEditor({ character }: { character: RRCharacter }) {
  const dispatch = useServerDispatch();

  function getIcon(proficiency: proficiencyValues | null) {
    return proficiency === "notProficient" || proficiency === null
      ? faEmptyCircle
      : proficiency === "halfProficient"
      ? faAdjust
      : proficiency === "proficient"
      ? faCircle
      : proficiency === "doublyProficient"
      ? faPlusCircle
      : faQuestionCircle;
  }

  function calculateModifierWithProficiency(
    baseStat: (typeof characterStatNames)[number],
    proficiency: proficiencyValues | null
  ) {
    return character.stats[baseStat] === null
      ? 0
      : typeof proficiency === "number"
      ? proficiency
      : modifierFromStat(character.stats[baseStat]!) +
        calculateProficiencyBonus(
          character.attributes["proficiency"] ?? 0,
          proficiency ?? "notProficient"
        );
  }

  function changeProficiencyInSavingThrow(
    proficiency: proficiencyValues | null,
    stat: (typeof characterStatNames)[number]
  ) {
    const newValue =
      typeof proficiency === "number"
        ? 0
        : proficiencyValueStrings[
            (proficiencyValueStrings.indexOf(proficiency ?? "notProficient") +
              1) %
              4
          ]!;
    dispatch((state) => {
      const oldSavingThrows =
        state.characters.entities[character.id]?.savingThrows;
      if (!oldSavingThrows) {
        return [];
      }
      return {
        actions: [
          characterUpdate({
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
    proficiency: proficiencyValues | null,
    skill: (typeof skillNames)[number]
  ) {
    const newValue =
      typeof proficiency === "number"
        ? 0
        : proficiencyValueStrings[
            (proficiencyValueStrings.indexOf(proficiency ?? "notProficient") +
              1) %
              4
          ]!;
    dispatch((state) => {
      const oldSkills = state.characters.entities[character.id]?.skills;
      if (!oldSkills) {
        return [];
      }
      return {
        actions: [
          characterUpdate({
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
        const proficiency = character.savingThrows[stat];
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
        const proficiency = character.skills[skill];
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
}: {
  name: (typeof characterStatNames)[number];
  character: RRCharacter;
}) {
  const dispatch = useServerDispatch();

  function modifier(stat: number) {
    return Math.floor((stat - 10) / 2);
  }

  function updateValue(newValue: React.SetStateAction<number | null>) {
    dispatch((state) => {
      const oldStats = state.characters.entities[character.id]?.stats;
      if (!oldStats) {
        return [];
      }
      return {
        actions: [
          characterUpdate({
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
      <p className="text-2xl">
        {value === null
          ? "-"
          : modifier(value) >= 1
          ? `+${modifier(value)}`
          : modifier(value)}
      </p>
      <div className="flex items-center justify-center">
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
