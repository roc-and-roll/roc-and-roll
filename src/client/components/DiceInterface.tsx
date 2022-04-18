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
  const [previousRolls, setPreviousRolls] = useState<
    { diceTypes: string[]; bonuses: number | null }[]
  >([]);
  const myself = useMyProps("id");
  const character = useMySelectedCharacters("id", "diceTemplateCategories")[0];
  const dispatch = useServerDispatch();
  const alert = useAlert();
  const prompt = usePrompt();

  const [focusIndex, setFocusIndex] = useState({ col: 0, row: 0 });

  const prevRoll1Ref = React.useRef<HTMLButtonElement>(null);
  const prevRoll2Ref = React.useRef<HTMLButtonElement>(null);
  const prevRoll3Ref = React.useRef<HTMLButtonElement>(null);
  const prevRoll4Ref = React.useRef<HTMLButtonElement>(null);
  const prevRoll5Ref = React.useRef<HTMLButtonElement>(null);
  const prevRoll6Ref = React.useRef<HTMLButtonElement>(null);
  const prevRollRefs = useMemo(
    () => [
      prevRoll1Ref,
      prevRoll2Ref,
      prevRoll3Ref,
      prevRoll4Ref,
      prevRoll5Ref,
      prevRoll6Ref,
    ],
    []
  );

  const secondaryDiceTypes = [4, 6, 8, 10, 12];
  const d4Ref = React.useRef<HTMLButtonElement>(null);
  const d6Ref = React.useRef<HTMLButtonElement>(null);
  const d8Ref = React.useRef<HTMLButtonElement>(null);
  const d10Ref = React.useRef<HTMLButtonElement>(null);
  const d12Ref = React.useRef<HTMLButtonElement>(null);
  const d20Ref = React.useRef<HTMLButtonElement>(null);
  const col1Refs = useMemo(
    () => [
      d4Ref,
      d6Ref,
      d8Ref,
      d10Ref,
      d12Ref,
      d20Ref,
      prevRoll1Ref,
      prevRoll4Ref,
    ],
    []
  );

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
  const modRefsLeft = useMemo(
    () => [modM2Ref, modM1Ref, modP1Ref, modP2Ref, modP3Ref, modP4Ref],
    []
  );
  const modRefsRight = useMemo(
    () => [modP5Ref, modP6Ref, modP7Ref, modP8Ref, modP9Ref, modP10Ref],
    []
  );
  const modRefs = [...modRefsLeft, ...modRefsRight];
  const col2Refs = useMemo(
    () => [...modRefsLeft, prevRoll2Ref, prevRoll5Ref],
    [modRefsLeft]
  );
  const col3Refs = useMemo(
    () => [...modRefsRight, prevRoll2Ref, prevRoll5Ref],
    [modRefsRight]
  );

  const tempRef = React.useRef<HTMLButtonElement>(null);
  const rollRef = React.useRef<HTMLButtonElement>(null);
  const clearRef = React.useRef<HTMLButtonElement>(null);

  const col4Refs = useMemo(
    () => [
      tempRef,
      rollRef,
      rollRef,
      rollRef,
      rollRef,
      clearRef,
      prevRoll3Ref,
      prevRoll6Ref,
    ],
    []
  );

  const allRefs = useMemo(
    () => [col1Refs, col2Refs, col3Refs, col4Refs],
    [col1Refs, col2Refs, col3Refs, col4Refs]
  );

  // TODO: add shortcut to switch focus to dice roller window?
  //       (and open it if it isn't currently open)

  // TODO: previous rolls in higher state
  /* 
  d4     |-1|+5|temp
  d6     |-2|+6|roll1
  d8     |+1|+7|roll2
  d10    |+2|+8|roll3
  d12    |+3|+9|roll4
  d20|a|d|+4|10|clear
  prev1  |prev2|prev3
  prev4  |prev5|prev6
  */

  /* 
  optional button objects:
  d4: {
    left: temp
    right: -1
    up: d20
    down: d6
  } ...

  for d20, adv, dis: 
    make distinction bei "moveLeft" and "moveRight" functions or
    make own columns (compare roll button)
  */

  useEffect(() => {
    const currentRef = allRefs[focusIndex.col]![focusIndex.row]!.current;
    if (currentRef) {
      currentRef.focus();
    }
  }, [allRefs, focusIndex]);

  function focusIndexFromRef(
    searchedRef: React.RefObject<HTMLButtonElement> | undefined
  ) {
    if (searchedRef === undefined) return;
    const col = allRefs.findIndex((refs) =>
      refs.find((ref) => ref === searchedRef)
    );
    const row = allRefs[col]!.findIndex((ref) => ref === searchedRef);
    setFocusIndex({ col: col, row: row });
  }

  const moveFocusUp = () => {
    const startRef = allRefs[focusIndex.col]![focusIndex.row]!.current;
    const upperLimit = allRefs[focusIndex.col]!.length;

    let currentRef;
    let newRow = focusIndex.row;
    do {
      newRow = (newRow - 1 + upperLimit) % upperLimit;
      currentRef = allRefs[focusIndex.col]![newRow]!.current;
    } while (
      currentRef === startRef ||
      currentRef === null ||
      currentRef.disabled
    );

    setFocusIndex((prevState) => {
      return { ...prevState, row: newRow };
    });
  };

  const moveFocusLeft = () => {
    const startRef = allRefs[focusIndex.col]![focusIndex.row]!.current;
    const upperLimit = allRefs.length;

    let currentRef;
    let newCol = focusIndex.col;
    do {
      newCol = (newCol - 1 + upperLimit) % upperLimit;
      currentRef = allRefs[newCol]![focusIndex.row]!.current;
    } while (
      currentRef === startRef ||
      currentRef === null ||
      currentRef.disabled
    );

    setFocusIndex((prevState) => {
      return { ...prevState, col: newCol };
    });
  };

  const moveFocusDown = () => {
    const startRef = allRefs[focusIndex.col]![focusIndex.row]!.current;
    const upperLimit = allRefs[focusIndex.col]!.length;

    let currentRef;
    let newRow = focusIndex.row;
    do {
      newRow = (newRow + 1) % upperLimit;
      currentRef = allRefs[focusIndex.col]![newRow]!.current;
    } while (
      currentRef === startRef ||
      currentRef === null ||
      currentRef.disabled
    );

    setFocusIndex((prevState) => {
      return { ...prevState, row: newRow };
    });
  };

  const moveFocusRight = () => {
    const startRef = allRefs[focusIndex.col]![focusIndex.row]!.current;
    const upperLimit = allRefs.length;

    let currentRef;
    let newCol = focusIndex.col;
    do {
      newCol = (newCol + 1) % upperLimit;
      currentRef = allRefs[newCol]![focusIndex.row]!.current;
    } while (
      currentRef === startRef ||
      currentRef === null ||
      currentRef.disabled
    );

    setFocusIndex((prevState) => {
      return { ...prevState, col: newCol };
    });
  };

  async function handleKeyDown(e: any) {
    switch (e.code) {
      case "KeyW":
        moveFocusUp();
        break;
      case "ArrowUp":
        moveFocusUp();
        break;
      case "KeyA":
        moveFocusLeft();
        break;
      case "ArrowLeft":
        moveFocusLeft();
        break;
      case "KeyS":
        moveFocusDown();
        break;
      case "ArrowDown":
        moveFocusDown();
        break;
      case "KeyD":
        moveFocusRight();
        break;
      case "ArrowRight":
        moveFocusRight();
        break;
      case "Enter":
        // TODO: shift + enter for template?
        await doRoll(false);
        break;
      case "Space":
        return true;
      default:
        break;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    e.preventDefault();
  }

  const doRoll = async (
    addTemplate: boolean,
    roll?: { diceTypes: string[]; bonuses: number | null }
  ) => {
    const localBonuses = roll ? roll.bonuses : bonuses;
    const localDiceTypes = roll ? roll.diceTypes : diceTypes;

    const bonusesString =
      localBonuses === null
        ? ""
        : localBonuses >= 0
        ? "+" + localBonuses.toString()
        : localBonuses.toString();
    const rollString = localDiceTypes.join("+") + bonusesString;

    if (rollString === "") return;

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
    const justRolled = { diceTypes: localDiceTypes, bonuses: localBonuses };
    let newPreviousRolls = previousRolls.filter(
      (roll) =>
        !(
          roll.diceTypes.join("/") === justRolled.diceTypes.join("/") &&
          roll.bonuses === justRolled.bonuses
        )
    );
    newPreviousRolls = [justRolled, ...newPreviousRolls].slice(0, 6);
    setPreviousRolls(newPreviousRolls);
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
                  {secondaryDiceTypes.map((dice) => {
                    const ref = col1Refs[secondaryDiceTypes.indexOf(dice)];
                    return (
                      <Button
                        key={dice}
                        onClick={() => {
                          addDiceType(`d${dice}`);
                          focusIndexFromRef(ref);
                        }}
                        className="w-full"
                        ref={ref}
                      >
                        d{dice}
                      </Button>
                    );
                  })}
                  <div className="flex">
                    <Button
                      className="w-2/5"
                      onClick={() => {
                        addDiceType("d20");
                        focusIndexFromRef(d20Ref);
                      }}
                      ref={d20Ref} // diceTypeRefs[diceTypeRefs.length - 1]
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
                  {modTypes.map((bonus) => {
                    const ref = modRefs[modTypes.indexOf(bonus)];
                    return (
                      <Button
                        className="h-1/6 w-1/2 flex-1"
                        key={bonus}
                        onClick={() => {
                          addBonus(bonus);
                          focusIndexFromRef(ref);
                        }}
                        ref={ref}
                      >
                        {bonus > 0 ? "+" + bonus.toString() : bonus}
                      </Button>
                    );
                  })}
                </td>

                <td>
                  <Button
                    className="w-full"
                    disabled={!character}
                    onClick={async () => {
                      await doRoll(true);
                      focusIndexFromRef(tempRef);
                    }}
                    ref={tempRef}
                    title={character ? undefined : "No character selected"}
                  >
                    <p>Template</p>
                  </Button>
                  <Button
                    className="w-full h-[120px]"
                    onClick={async () => {
                      await doRoll(false);
                      focusIndexFromRef(rollRef);
                    }}
                    ref={rollRef}
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
                  <Button
                    className="w-full"
                    onClick={() => {
                      clear();
                      focusIndexFromRef(clearRef);
                    }}
                    ref={clearRef}
                  >
                    Clear Input
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
          <p>
            {previousRolls.map((roll) => {
              const ref = prevRollRefs[previousRolls.indexOf(roll)];
              return (
                <Button
                  key={roll.diceTypes.join("") + String(roll.bonuses)}
                  onClick={async () => {
                    await doRoll(false, roll);
                    focusIndexFromRef(prevRoll1Ref);
                  }}
                  ref={ref}
                  style={{ width: "33.3%" }}
                >
                  {roll.diceTypes.join(" + ")}{" "}
                  {roll.bonuses === null
                    ? ""
                    : roll.bonuses >= 0
                    ? "+" + roll.bonuses.toString()
                    : roll.bonuses.toString()}
                </Button>
              );
            })}
          </p>
        </div>
      </div>
    </>
  );
}
