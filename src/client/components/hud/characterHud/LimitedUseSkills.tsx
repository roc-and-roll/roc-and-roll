import { faBed, faMugHot } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import React from "react";
import { characterUpdate } from "../../../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../../../shared/constants";
import { RRCharacter, RRLimitedUseSkill } from "../../../../shared/state";
import { useConfirm } from "../../../dialog-boxes";
import { useServerDispatch } from "../../../state";
import { Button } from "../../ui/Button";
import { RRCharacterProps } from "./Character";

export function LimitedUse({ character }: { character: RRCharacterProps }) {
  const dispatch = useServerDispatch();
  const confirm = useConfirm();
  const setLimitedUseSkills = (
    updater: React.SetStateAction<RRCharacter["limitedUseSkills"]>
  ) =>
    dispatch((state) => {
      const oldSkills =
        state.characters.entities[character.id]?.limitedUseSkills;

      if (oldSkills === undefined) return [];

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

  function doSkill(index: number, skill: RRLimitedUseSkill) {
    setLimitedUseSkills([
      ...character.limitedUseSkills.slice(0, index),
      { ...skill, currentUseCount: skill.currentUseCount + 1 },
      ...character.limitedUseSkills.slice(index + 1),
    ]);
  }

  async function takeRest(isLongRest: boolean) {
    if (
      await confirm(
        `Do you really want to take a ${
          isLongRest ? "long" : "short"
        } rest and reset your skills?`
      )
    ) {
      setLimitedUseSkills((skills) =>
        skills.map((skill) => {
          let currentUseCount = skill.currentUseCount;
          if (skill.restoresAt === "shortRest") currentUseCount = 0;
          else if (isLongRest) currentUseCount = 0;
          return { ...skill, currentUseCount };
        })
      );
    }
  }

  return (
    <div className="min-w-full select-none bg-black/40 p-1 rounded pointer-events-auto">
      <div className="flex justify-end">
        <Button onClick={() => takeRest(true)}>
          <FontAwesomeIcon fixedWidth icon={faBed} />
        </Button>
        <Button onClick={() => takeRest(false)}>
          <FontAwesomeIcon fixedWidth icon={faMugHot} />
        </Button>
      </div>
      {character.limitedUseSkills.map((skill, index) => {
        const skillUsed = skill.currentUseCount >= skill.maxUseCount;
        return (
          <div
            key={index}
            className={clsx(
              "flex items-center",
              skillUsed ? "line-through opacity-50" : "cursor-pointer"
            )}
            onClick={() => {
              if (skillUsed) return;
              doSkill(index, skill);
            }}
          >
            {skill.name}
            <div className="text-right flex-grow">
              {skill.currentUseCount} / {skill.maxUseCount}
            </div>
            <FontAwesomeIcon
              className="ml-2"
              fixedWidth
              icon={skill.restoresAt === "longRest" ? faBed : faMugHot}
            />
          </div>
        );
      })}
    </div>
  );
}
