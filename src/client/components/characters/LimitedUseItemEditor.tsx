import { faPlusCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import {
  characterTemplateUpdate,
  characterUpdate,
} from "../../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../../shared/constants";
import { RRCharacter, RRLimitedUseSkill } from "../../../shared/state";
import { useServerDispatch } from "../../state";
import { SmartTextInput } from "../ui/TextInput";

export const LimitedUseSkillEditor = React.memo<{
  character: RRCharacter;
  isTemplate?: boolean;
}>(function CharacterSheetEditor({ character, isTemplate }) {
  const dispatch = useServerDispatch();
  const updateFunc = isTemplate ? characterTemplateUpdate : characterUpdate;

  const setLimitedUseSkills = (
    updater: React.SetStateAction<RRCharacter["limitedUseSkills"]>
  ) =>
    dispatch((state) => {
      const oldSkills =
        state[isTemplate ? "characterTemplates" : "characters"].entities[
          character.id
        ]?.limitedUseSkills;

      if (oldSkills === undefined) {
        return [];
      }
      const newSkills =
        typeof updater === "function" ? updater(oldSkills) : updater;

      return {
        actions: [
          updateFunc({
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

  function updateMaxCount(
    maxUseCount: number,
    index: number,
    skill: RRLimitedUseSkill
  ) {
    setLimitedUseSkills([
      ...character.limitedUseSkills.slice(0, index),
      { ...skill, maxUseCount },
      ...character.limitedUseSkills.slice(index + 1),
    ]);
  }

  return (
    <div>
      {character.limitedUseSkills.map((skill, index) => {
        <div key={index}>
          <p>{index}</p>
          <SmartTextInput
            value={skill.name}
            onChange={(value) => updateName(value, index, skill)}
          />
          <hr className="mb-0" />
        </div>;
      })}
      <FontAwesomeIcon
        icon={faPlusCircle}
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
      />
    </div>
  );
});
