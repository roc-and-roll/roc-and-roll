import React, { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/Button";
import {
  logEntryDiceRollAdd,
  characterAddDiceTemplate,
  characterAddDiceTemplateCategory,
} from "../../shared/actions";
import { useMyProps, useMySelectedCharacters } from "../myself";
import { useServerDispatch } from "../state";
import { tryConvertDiceRollTreeToDiceTemplateParts } from "../dice-rolling/dice-template-interop";
import { parseDiceString } from "../dice-rolling/grammar";
import { DiceRollTree } from "../../shared/dice-roll-tree-types-and-validation";
import { rollDiceRollTree } from "../dice-rolling/roll";
import { rrid } from "../../shared/util";
import { useAlert, usePrompt } from "../dialog-boxes";
import {
  RRDiceTemplate,
  RRDiceTemplateCategory,
} from "../../shared/validation";

export function DiceInterface() {
  const [diceTypes, setDiceTypes] = useState<string[]>([]);
  const [bonuses, setBonuses] = useState<number | null>(null);
  const myself = useMyProps("id");
  const character = useMySelectedCharacters("id", "diceTemplateCategories")[0];
  const dispatch = useServerDispatch();
  const alert = useAlert();
  const prompt = usePrompt();

  const [focusIndex, setFocusIndex] = useState({ col: 0, row: 0 });
  const secondaryDiceTypes = [4, 6, 8, 10, 12];

  const d4Ref = React.useRef<HTMLButtonElement>(null);
  const d6Ref = React.useRef<HTMLButtonElement>(null);
  const d8Ref = React.useRef<HTMLButtonElement>(null);
  const d10Ref = React.useRef<HTMLButtonElement>(null);
  const d12Ref = React.useRef<HTMLButtonElement>(null);
  const d20Ref = React.useRef<HTMLButtonElement>(null);

  const modTypesLeft = [-2, -1, 1, 2, 3, 4];
  const modTypesRight = [5, 6, 7, 8, 9, 10];
  const modTypes = [...modTypesLeft, ...modTypesRight];

  const modM2Ref = React.useRef<HTMLButtonElement>(null);
  const modM1Ref = React.useRef<HTMLButtonElement>(null);
  const modP1Ref = React.useRef<HTMLButtonElement>(null);
  const modP2Ref = React.useRef<HTMLButtonElement>(null);
  const modP3Ref = React.useRef<HTMLButtonElement>(null);
  const modP4Ref = React.useRef<HTMLButtonElement>(null);
  const modP5Ref = React.useRef<HTMLButtonElement>(null);
  const modP6Ref = React.useRef<HTMLButtonElement>(null);
  const modP7Ref = React.useRef<HTMLButtonElement>(null);
  const modP8Ref = React.useRef<HTMLButtonElement>(null);
  const modP9Ref = React.useRef<HTMLButtonElement>(null);
  const modP10Ref = React.useRef<HTMLButtonElement>(null);

  const diceTypeRefs = useMemo(
    () => [d4Ref, d6Ref, d8Ref, d10Ref, d12Ref, d20Ref],
    []
  );

  const modRefsLeft = useMemo(
    () => [modM2Ref, modM1Ref, modP1Ref, modP2Ref, modP3Ref, modP4Ref],
    []
  );
  const modRefsRight = useMemo(
    () => [modP5Ref, modP6Ref, modP7Ref, modP8Ref, modP9Ref, modP10Ref],
    []
  );
  const modRefs = [...modRefsLeft, ...modRefsRight];

  const allRefs = useMemo(
    () => [diceTypeRefs, modRefsLeft, modRefsRight],
    [diceTypeRefs, modRefsLeft, modRefsRight]
  );

  // TODO: when opening dice roller, set focus directly to a button?
  // TODO: add shortcut to switch focus to dice roller window?
  //       (and open it in the first place)
  // TODO: useEffect to set focus on d4
  // TODO: Arrays for each col of buttons and switch columns on <- + ->
  /* 
  d4     |-1|+5|temp
  d6     |-2|+5|roll1
  d8     |+1|+7|roll2
  d10    |+2|+8|roll3
  d12    |+3|+9|roll4
  d20|a|d|+4|10|clear
  */

  /* 
  d4: {
    left: temp
    right: -1
    up: d20
    down: d6
  } ...

  d20, a, d: make distinction bei "moveLeft" and "moveRight" functions
  */

  useEffect(() => {
    console.log("row", focusIndex.row);
    const currentRef = allRefs[focusIndex.col]![focusIndex.row]!.current;
    console.log("btn", currentRef?.innerHTML);
    if (currentRef) {
      currentRef.focus();
    }
  }, [allRefs, focusIndex]);

  const moveFocusUp = () => {
    const upperLimit = allRefs[focusIndex.col]!.length;
    const newRow = (focusIndex.row - 1 + upperLimit) % upperLimit;
    setFocusIndex((prevState) => {
      return { ...prevState, row: newRow };
    });
  };

  // const moveFocusLeft = () => {
  //   const upperLimit = secondaryDiceTypes.length;
  //   const newFocusIndex = (focusIndex - 1 + upperLimit) % upperLimit;
  //   setFocusIndex(newFocusIndex);
  //   if (diceTypeRefs[focusIndex]?.current) {
  //     diceTypeRefs[focusIndex]!.current!.focus();
  //   }
  // };

  const moveFocusDown = () => {
    const upperLimit = allRefs[focusIndex.col]!.length;
    const newRow = (focusIndex.row + 1) % upperLimit;
    setFocusIndex((prevState) => {
      return { ...prevState, row: newRow };
    });
  };

  const moveFocusRight = () => {
    const upperLimit = allRefs.length;
    const newCol = (focusIndex.col + 1) % upperLimit;
    setFocusIndex((prevState) => {
      return { ...prevState, col: newCol };
    });
  };

  // const moveFocusRight = () => {
  //   const upperLimit = secondaryDiceTypes.length;
  //   const newFocusIndex = (focusIndex - 1 + upperLimit) % upperLimit;
  //   setFocusIndex(newFocusIndex);
  //   if (diceTypeRefs[focusIndex]?.current) {
  //     diceTypeRefs[focusIndex]!.current!.focus();
  //   }
  // };

  function handleKeyDown(e: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    e.preventDefault();

    switch (e.code) {
      case "KeyW":
        moveFocusUp();
        break;
      case "KeyA":
        moveFocusUp();
        break;
      case "KeyS":
        moveFocusDown();
        break;
      case "KeyD":
        moveFocusRight();
        break;
      default:
        break;
    }
  }

  const doRoll = async (addTemplate: boolean) => {
    const bonusesString =
      bonuses === null
        ? ""
        : bonuses >= 0
        ? "+" + bonuses.toString()
        : bonuses.toString();
    const rollString = diceTypes.join("+") + bonusesString;

    let diceRollTree: DiceRollTree<false>;
    try {
      diceRollTree = parseDiceString(rollString);
    } catch (error) {
      console.error({ rollString, error });
      await alert("Invalid dice input.");
      return;
    }

    if (addTemplate) {
      const parts = tryConvertDiceRollTreeToDiceTemplateParts(diceRollTree);
      if (parts === false) {
        await alert(
          "Cannot convert dice roll to template (only simple additive templates are currently supported)."
        );
        return;
      }

      const name =
        (await prompt("Name of the new dice template"))?.trim() ?? "";
      let categoryId;
      if (character!.diceTemplateCategories.length < 1) {
        const newTemplateCategoryAction = characterAddDiceTemplateCategory({
          id: character!.id,
          category: {
            categoryName: "Generated Templates",
            id: rrid<RRDiceTemplateCategory>(),
            icon: "wrench",
            templates: [],
          },
        });

        dispatch(newTemplateCategoryAction);
        categoryId = newTemplateCategoryAction.payload.category.id;
      } else {
        categoryId = character!.diceTemplateCategories[0]!.id;
      }
      dispatch(
        characterAddDiceTemplate({
          id: character!.id,
          // FIXME should allow to select
          categoryId,
          template: {
            id: rrid<RRDiceTemplate>(),
            name,
            notes: "",
            parts,
            rollType: "attack",
          },
        })
      );
    } else {
      dispatch(
        logEntryDiceRollAdd({
          silent: false,
          playerId: myself.id,
          payload: {
            characterIds: character ? [character.id] : null,
            diceRollTree: rollDiceRollTree(diceRollTree),
            rollType: null,
            rollName: null,
            tooltip: null,
          },
        })
      );
    }
    setDiceTypes([]);
    setBonuses(null);
  };

  function addDiceType(diceType: string) {
    const index = diceTypes.findIndex((element) => element.includes(diceType));
    if (index >= 0) {
      let splitLetter = "";
      if (diceTypes[index]?.includes("d")) {
        splitLetter = "d";
      } else if (diceTypes[index]?.includes("a")) {
        splitLetter = "a";
      } else if (diceTypes[index]?.includes("i")) {
        splitLetter = "i";
      }

      const diceInfo = diceTypes[index]?.split(splitLetter);
      if (diceInfo === undefined) {
        return;
      }
      const diceCount = diceInfo[0];
      let newCount;
      if (diceCount) {
        newCount = parseInt(diceCount) + 1;
      } else {
        newCount = 2;
      }
      const newDiceType = `${newCount}${splitLetter}${diceInfo[1]!}`;
      const newDiceTypes = [...diceTypes];
      newDiceTypes[index] = newDiceType;
      setDiceTypes(newDiceTypes);
    } else {
      setDiceTypes([...diceTypes, `1${diceType}`]);
    }
  }

  function addBonus(bonus: number) {
    setBonuses((bonuses) => (bonuses ?? 0) + bonus);
  }

  function clear() {
    setBonuses(null);
    setDiceTypes([]);
  }

  return (
    <>
      <div id="pane" onKeyDown={handleKeyDown}>
        <div>
          <table className="w-full h-full">
            <tbody>
              <tr>
                <th className="w-1/3">Type</th>
                <th className="w-1/3">Bonus</th>
                <th />
              </tr>
              <tr>
                <td>
                  {secondaryDiceTypes.map((dice) => (
                    <Button
                      key={dice}
                      onClick={() => addDiceType(`d${dice}`)}
                      className="w-full"
                      ref={diceTypeRefs[secondaryDiceTypes.indexOf(dice)]}
                    >
                      d{dice}
                    </Button>
                  ))}
                  <div className="flex">
                    <Button
                      className="w-2/5"
                      onClick={() => addDiceType("d20")}
                      ref={diceTypeRefs[diceTypeRefs.length - 1]}
                    >
                      d20
                    </Button>
                    <Button
                      style={{ width: "30%", fontSize: "0.7rem" }}
                      className="green"
                      onClick={() => addDiceType("a20")}
                    >
                      ADV
                    </Button>
                    <Button
                      style={{ width: "30%", fontSize: "0.7rem" }}
                      className="red"
                      onClick={() => addDiceType("i20")}
                    >
                      DIS
                    </Button>
                  </div>
                </td>
                <td className="flex flex-wrap flex-col h-[182px]">
                  {modTypes.map((bonus) => (
                    <Button
                      className="h-1/6 w-1/2 flex-1"
                      key={bonus}
                      onClick={() => addBonus(bonus)}
                      ref={modRefs[modTypes.indexOf(bonus)]}
                    >
                      {bonus > 0 ? "+" + bonus.toString() : bonus}
                    </Button>
                  ))}
                </td>

                <td>
                  <Button
                    className="w-full"
                    disabled={!character}
                    onClick={() => doRoll(true)}
                    title={character ? undefined : "No character selected"}
                  >
                    <p>Template</p>
                  </Button>
                  <Button
                    className="w-full h-[120px]"
                    onClick={() => doRoll(false)}
                    disabled={bonuses === null && diceTypes.length === 0}
                  >
                    <p>ROLL IT</p>
                    <p>{diceTypes.join(" + ")}</p>
                    <div>
                      {bonuses === null
                        ? ""
                        : bonuses >= 0
                        ? "+" + bonuses.toString()
                        : bonuses.toString()}
                    </div>
                  </Button>
                  <Button className="w-full" onClick={() => clear()}>
                    Clear Input
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
