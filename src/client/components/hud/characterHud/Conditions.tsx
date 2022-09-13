import { faCompressArrowsAlt, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import React, { useState } from "react";
import { characterUpdate } from "../../../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../../../shared/constants";
import {
  RRCharacter,
  conditionTooltip,
  conditionNames,
} from "../../../../shared/state";
import { useServerDispatch } from "../../../state";
import { conditionIcons } from "../../characters/CharacterEditor";
import { Popover } from "../../Popover";
import { useConfirm } from "../../../dialog-boxes";
import { RRCharacterProps } from "./Character";

export function ConditionsBar({ character }: { character: RRCharacterProps }) {
  const [conditionChooserOpen, setConditionChooserOpen] = useState(false);
  const dispatch = useServerDispatch();
  const confirm = useConfirm();

  const setConditions = (
    updater: React.SetStateAction<RRCharacter["conditions"]>
  ) =>
    dispatch((state) => {
      const oldConditions = state.characters.entities[character.id]?.conditions;

      if (oldConditions === undefined) {
        return [];
      }

      const newConditions =
        typeof updater === "function" ? updater(oldConditions) : updater;

      return {
        actions: [
          characterUpdate({
            id: character.id,
            changes: { conditions: newConditions },
          }),
        ],
        optimisticKey: "conditions",
        syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
      };
    });

  const roundsLeftShortened: string = !character.currentlyConcentratingOn
    ? ""
    : character.currentlyConcentratingOn.roundsLeft > 9000
    ? "∞"
    : character.currentlyConcentratingOn.roundsLeft.toString();

  return (
    <div className="flex flex-wrap flex-row-reverse pointer-events-auto">
      {character.currentlyConcentratingOn && (
        <div
          onClick={async () => {
            if (
              await confirm(
                `Stop concentrating on ${
                  character.currentlyConcentratingOn!.name
                }?`
              )
            ) {
              dispatch(
                characterUpdate({
                  id: character.id,
                  changes: { currentlyConcentratingOn: null },
                })
              );
            }
          }}
          className={clsx(
            character.currentlyConcentratingOn.roundsLeft <= 1
              ? "bg-red-700"
              : character.currentlyConcentratingOn.roundsLeft <= 3
              ? "bg-orange-500"
              : "bg-gray-200",
            "self-center select-none rounded-lg p-1 text-black ml-1"
          )}
          title={`${character.currentlyConcentratingOn.name}\n${roundsLeftShortened} rounds left`}
        >
          <FontAwesomeIcon icon={faCompressArrowsAlt} /> {roundsLeftShortened}
        </div>
      )}

      {character.conditions.map((condition) => {
        const icon = conditionIcons[condition];
        return (
          <div
            key={condition}
            title={conditionTooltip(condition)}
            className="h-8 w-8 m-1 my-2 cursor-pointer"
            onClick={() => {
              setConditions((c) => c.filter((c) => c !== condition));
            }}
          >
            {typeof icon === "string" ? (
              <img src={icon}></img>
            ) : (
              <FontAwesomeIcon
                icon={icon}
                color="black"
                size={"2x"}
                style={{
                  stroke: "white",
                  strokeWidth: 18,
                }}
              />
            )}
          </div>
        );
      })}
      <Popover
        content={
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="flex flex-wrap"
          >
            {conditionNames
              .filter((c) => !character.conditions.includes(c))
              .map((condition) => {
                const icon = conditionIcons[condition];
                return (
                  <div
                    key={condition}
                    title={conditionTooltip(condition)}
                    className="h-14 w-11 m-1 my-2"
                    onClick={() => {
                      setConditions((c) => [...c, condition]);
                      setConditionChooserOpen(false);
                    }}
                  >
                    {typeof icon === "string" ? (
                      <img src={icon}></img>
                    ) : (
                      <FontAwesomeIcon
                        icon={icon}
                        color="black"
                        fixedWidth
                        style={{
                          stroke: "white",
                          strokeWidth: 18,
                          fontSize: "calc(2.75rem / 1.25em)",
                        }}
                      />
                    )}
                    <p className="text-xs truncate text-center">{condition}</p>
                  </div>
                );
              })}
          </div>
        }
        visible={conditionChooserOpen}
        onClickOutside={() => setConditionChooserOpen(false)}
        interactive
        placement="bottom"
      >
        <div
          title="Add Condition"
          className="h-8 w-8 m-1 my-2 flex items-center justify-center rounded-full bg-rr-500 cursor-pointer"
          onClick={() => setConditionChooserOpen((b) => !b)}
        >
          <FontAwesomeIcon icon={faPlus} color="black" size={"1x"} />
        </div>
      </Popover>
    </div>
  );
}
