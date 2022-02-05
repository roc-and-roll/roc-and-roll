import {
  faBed,
  faMinusSquare,
  faMugHot,
  faPlusCircle,
  faPlusSquare,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import React from "react";
import { characterUpdate } from "../../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../../shared/constants";
import { RRCharacter, RRLimitedUseSkill } from "../../../shared/state";
import { useServerDispatch } from "../../state";
import { Button } from "../ui/Button";
import { SmartIntegerInput, SmartTextInput } from "../ui/TextInput";

export const LimitedUseSkillEditor = React.memo<{
  character: RRCharacter;
}>(function CharacterSheetEditor({ character }) {
  const dispatch = useServerDispatch();

  const setLimitedUseSkills = (
    updater: React.SetStateAction<RRCharacter["limitedUseSkills"]>
  ) =>
    dispatch((state) => {
      const oldSkills =
        state.characters.entities[character.id]?.limitedUseSkills;

      if (oldSkills === undefined) {
        return [];
      }
      const newSkills =
        typeof updater === "function" ? updater(oldSkills) : updater;

      return {
        actions: [
          characterUpdate({
            id: character.id,
            changes: { limitedUseSkills: newSkills },
          }),
        ],
        optimisticKey: "limitedUseSkills",
        syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
      };
    });

  function updateName(name: string, index: number, skill: RRLimitedUseSkill) {
    setLimitedUseSkills([
      ...character.limitedUseSkills.slice(0, index),
      { ...skill, name },
      ...character.limitedUseSkills.slice(index + 1),
    ]);
  }

  function updateCount(
    newCount: number,
    countName: "maxUseCount" | "currentUseCount",
    index: number,
    skill: RRLimitedUseSkill
  ) {
    if (
      newCount < 0 ||
      (countName === "currentUseCount" && newCount > skill.maxUseCount)
    )
      return;
    setLimitedUseSkills([
      ...character.limitedUseSkills.slice(0, index),
      { ...skill, [countName]: newCount },
      ...character.limitedUseSkills.slice(index + 1),
    ]);
  }

  function updateRestoresAt(
    restoresAt: "longRest" | "shortRest",
    index: number,
    skill: RRLimitedUseSkill
  ) {
    setLimitedUseSkills([
      ...character.limitedUseSkills.slice(0, index),
      { ...skill, restoresAt },
      ...character.limitedUseSkills.slice(index + 1),
    ]);
  }

  function countEditor(
    valueName: "maxUseCount" | "currentUseCount",
    index: number,
    skill: RRLimitedUseSkill
  ) {
    return (
      <div className="flex items-center justify-center">
        <div
          onClick={() =>
            updateCount(skill[valueName] - 1, valueName, index, skill)
          }
        >
          <FontAwesomeIcon
            fixedWidth
            className="stat-change-icons"
            icon={faMinusSquare}
          ></FontAwesomeIcon>
        </div>
        <SmartIntegerInput
          min={0}
          className="stat-input"
          value={skill[valueName]}
          nullable
          onChange={(value) => updateCount(value ?? 0, valueName, index, skill)}
        />
        <div
          onClick={() =>
            updateCount(skill[valueName] + 1, valueName, index, skill)
          }
        >
          <FontAwesomeIcon
            fixedWidth
            className="stat-change-icons"
            icon={faPlusSquare}
          ></FontAwesomeIcon>
        </div>
      </div>
    );
  }

  return (
    <div>
      {character.limitedUseSkills.map((skill, index) => {
        return (
          <div key={index}>
            <SmartTextInput
              className="my-1"
              value={skill.name}
              onChange={(value) => updateName(value, index, skill)}
            />
            <p>Uses:</p>
            <p className="flex">
              {countEditor("currentUseCount", index, skill)}
              <p className="w-8 font-bold text-center text-lg justify-center">
                of
              </p>
              {countEditor("maxUseCount", index, skill)}
            </p>
            <div>
              <p>Restores At:</p>
              <Button
                className={clsx(
                  skill.restoresAt === "longRest"
                    ? "bg-rrOrange hover:bg-rrOrangeLighter"
                    : ""
                )}
                onClick={() => updateRestoresAt("longRest", index, skill)}
              >
                <FontAwesomeIcon icon={faBed} />
              </Button>
              <Button
                className={clsx(
                  skill.restoresAt === "shortRest"
                    ? "bg-rrOrange hover:bg-rrOrangeLighter"
                    : ""
                )}
                onClick={() => updateRestoresAt("shortRest", index, skill)}
              >
                <FontAwesomeIcon icon={faMugHot} />
              </Button>
            </div>
            <Button
              className="red"
              onClick={() => {
                setLimitedUseSkills([
                  ...character.limitedUseSkills.slice(0, index),
                  ...character.limitedUseSkills.slice(index + 1),
                ]);
              }}
            >
              Delete Skill
            </Button>
            <hr className="mb-0" />
          </div>
        );
      })}
      <Button
        className="w-16 block my-0 mx-auto"
        onClick={() => {
          setLimitedUseSkills((old) => [
            ...old,
            {
              maxUseCount: 1,
              currentUseCount: 0,
              name: "",
              restoresAt: "longRest",
            },
          ]);
        }}
      >
        <FontAwesomeIcon icon={faPlusCircle} />
      </Button>
    </div>
  );
});
