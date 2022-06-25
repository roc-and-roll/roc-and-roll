import React from "react";
import { useSmartChangeHP, useHealthBarMeasurements } from "../../../util";
import { HPInlineEdit } from "../../map/HPInlineEdit";
import { RRCharacterProps } from "./Character";

export function HealthBar({
  character,
  isGM,
  width,
}: {
  character: RRCharacterProps;
  isGM: boolean;
  width: number;
}) {
  const setHP = useSmartChangeHP(isGM);
  const {
    temporaryHPBarWidth,
    hpBarWidth,
    hpColor,
    temporaryHPColor,
    totalMaxHP,
  } = useHealthBarMeasurements(character, width);

  return (
    <div
      className="flex h-8 rounded-md overflow-hidden bg-white relative pointer-events-auto"
      style={{ width }}
    >
      {character.maxHP > 0 && (
        <>
          <div
            className="h-full absolute left-0 top-0"
            style={{
              width: hpBarWidth,
              height: "100%",
              backgroundColor: hpColor,
            }}
          />
          {character.temporaryHP > 0 && temporaryHPBarWidth > 0 && (
            <div
              className="h-full absolute top-0"
              style={{
                width: temporaryHPBarWidth,
                left: hpBarWidth,
                backgroundColor: temporaryHPColor,
              }}
            ></div>
          )}
        </>
      )}
      <div className="absolute h-full flex items-center justify-end left-4 right-4 select-none text-black rough-text text-2xl font-bold">
        <HPInlineEdit
          className="inline-block w-12 h-6 flex-1 mr-1 px-2 text-2xl"
          hp={character.hp + character.temporaryHP}
          setHP={(total) => setHP(character.id, total)}
        />{" "}
        / {totalMaxHP}
      </div>
    </div>
  );
}
