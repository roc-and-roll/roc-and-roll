import React, { useEffect, useState, useRef } from "react";
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
import { useLatest } from "../useLatest";
import useLocalState from "../useLocalState";
import { signedModifierString } from "../util";

export function DiceInterface() {
  const [diceTypes, setDiceTypes] = useState<string[]>([]);
  const [bonuses, setBonuses] = useState<number | null>(null);
  const [previousRolls, setPreviousRolls] = useLocalState<
    { diceTypes: string[]; bonuses: number | null }[]
  >("DiceInterface/previousRolls", []);
  const myself = useMyProps("id");
  const character = useMySelectedCharacters("id", "diceTemplateCategories")[0];
  const dispatch = useServerDispatch();
  const alert = useAlert();
  const prompt = usePrompt();

  const [focusIndex, setFocusIndex] = useState({ col: 0, row: 0 });

  const prevRollRefs = Array.from({ length: 6 }).map(() =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useRef<HTMLButtonElement>(null)
  );

  const secondaryDiceTypes = [4, 6, 8, 10, 12];
  const secondaryDiceRefs = secondaryDiceTypes.map(() =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useRef<HTMLButtonElement>(null)
  );
  const d20Ref = React.useRef<HTMLButtonElement>(null);
  const d20AdvRef = React.useRef<HTMLButtonElement>(null);
  const d20DisRef = React.useRef<HTMLButtonElement>(null);
  const [col1Refs, col2Refs, col3Refs] = [d20Ref, d20AdvRef, d20DisRef].map(
    (ref) => [...secondaryDiceRefs, ref, prevRollRefs[0], prevRollRefs[3]]
  );

  const modTypesLeft = [-2, -1, 1, 2, 3, 4];
  const modTypesRight = [5, 6, 7, 8, 9, 10];
  const modTypes = [...modTypesLeft, ...modTypesRight];
  const modRefsLeft = modTypesLeft.map(() =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useRef<HTMLButtonElement>(null)
  );
  const modRefsRight = modTypesRight.map(() =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useRef<HTMLButtonElement>(null)
  );
  const modRefs = [...modRefsLeft, ...modRefsRight];
  const col4Refs = [...modRefsLeft, prevRollRefs[1], prevRollRefs[4]];
  const col5Refs = [...modRefsRight, prevRollRefs[1], prevRollRefs[4]];

  const tempRef = React.useRef<HTMLButtonElement>(null);
  const rollRef = React.useRef<HTMLButtonElement>(null);
  const clearRef = React.useRef<HTMLButtonElement>(null);

  const col6Refs = [
    tempRef,
    rollRef,
    rollRef,
    rollRef,
    rollRef,
    clearRef,
    prevRollRefs[2],
    prevRollRefs[5],
  ];

  /*
   * d4     |-1|+5|temp
   * d6     |-2|+6|roll
   * d8     |+1|+7|roll
   * d10    |+2|+8|roll
   * d12    |+3|+9|roll
   * d20|a|d|+4|10|clear
   * prev1  |prev2|prev3
   * prev4  |prev5|prev6
   */
  const allRefs = useLatest([
    col1Refs,
    col2Refs,
    col3Refs,
    col4Refs,
    col5Refs,
    col6Refs,
  ]);

  // TODO: add shortcut to switch focus to dice roller window?
  //       (and open it if it isn't currently open)

  // TODO: previous rolls in higher state

  // TODO: different color (css) on focus

  useEffect(() => {
    const currentRef =
      allRefs.current[focusIndex.col]![focusIndex.row]!.current;
    if (currentRef) {
      currentRef.focus();
    }
  }, [allRefs, focusIndex]);

  function focusIndexFromRef(
    searchedRef: React.RefObject<HTMLButtonElement> | undefined
  ) {
    if (searchedRef === undefined) return;
    const col = allRefs.current.findIndex((refs) =>
      refs!.find((ref) => ref === searchedRef)
    );
    const row = allRefs.current[col]!.findIndex((ref) => ref === searchedRef);
    setFocusIndex({ col: col, row: row });
  }

  const moveFocusUp = () => {
    const startRef = allRefs.current[focusIndex.col]![focusIndex.row]!.current;
    const upperLimit = allRefs.current[focusIndex.col]!.length;

    let currentRef;
    let newRow = focusIndex.row;
    do {
      newRow = (newRow - 1 + upperLimit) % upperLimit;
      currentRef = allRefs.current[focusIndex.col]![newRow]!.current;
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
    const startRef = allRefs.current[focusIndex.col]![focusIndex.row]!.current;
    const upperLimit = allRefs.current.length;

    let currentRef;
    let newCol = focusIndex.col;
    do {
      newCol = (newCol - 1 + upperLimit) % upperLimit;
      currentRef = allRefs.current[newCol]![focusIndex.row]!.current;
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
    const startRef = allRefs.current[focusIndex.col]![focusIndex.row]!.current;
    const upperLimit = allRefs.current[focusIndex.col]!.length;

    let currentRef;
    let newRow = focusIndex.row;
    do {
      newRow = (newRow + 1) % upperLimit;
      currentRef = allRefs.current[focusIndex.col]![newRow]!.current;
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
    const startRef = allRefs.current[focusIndex.col]![focusIndex.row]!.current;
    const upperLimit = allRefs.current.length;

    let currentRef;
    let newCol = focusIndex.col;
    do {
      newCol = (newCol + 1) % upperLimit;
      currentRef = allRefs.current[newCol]![focusIndex.row]!.current;
    } while (
      currentRef === startRef ||
      currentRef === null ||
      currentRef.disabled
    );

    setFocusIndex((prevState) => {
      return { ...prevState, col: newCol };
    });
  };

  async function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.code) {
      case "KeyW":
      case "ArrowUp":
        moveFocusUp();
        break;
      case "KeyA":
      case "ArrowLeft":
        moveFocusLeft();
        break;
      case "KeyS":
      case "ArrowDown":
        moveFocusDown();
        break;
      case "KeyD":
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
      localBonuses === null ? "" : signedModifierString(localBonuses);
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
                    const ref = col1Refs![secondaryDiceTypes.indexOf(dice)];
                    return (
                      <Button
                        key={dice}
                        onClick={() => {
                          addDiceType(`d${dice}`);
                          focusIndexFromRef(ref);
                        }}
                        className="w-full diceInterface-btn"
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
                      onClick={() => {
                        addDiceType("a20");
                        focusIndexFromRef(d20AdvRef);
                      }}
                      ref={d20AdvRef}
                    >
                      ADV
                    </Button>
                    <Button
                      style={{ width: "30%", fontSize: "0.7rem" }}
                      className="red"
                      onClick={() => {
                        addDiceType("i20");
                        focusIndexFromRef(d20DisRef);
                      }}
                      ref={d20DisRef}
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
                        {signedModifierString(bonus)}
                      </Button>
                    );
                  })}
                </td>

                <td>
                  <Button
                    className="w-full"
                    disabled={!character}
                    onClick={async () => {
                      focusIndexFromRef(tempRef);
                      await doRoll(true);
                    }}
                    ref={tempRef}
                    title={character ? undefined : "No character selected"}
                  >
                    <p>Template</p>
                  </Button>
                  <Button
                    className="w-full h-[120px]"
                    onClick={async () => {
                      focusIndexFromRef(rollRef);
                      await doRoll(false);
                    }}
                    ref={rollRef}
                    disabled={bonuses === null && diceTypes.length === 0}
                  >
                    <p>ROLL IT</p>
                    <p>{diceTypes.join(" + ")}</p>
                    <div>
                      {bonuses === null ? "" : signedModifierString(bonuses)}
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
                    focusIndexFromRef(prevRollRefs[0]);
                    await doRoll(false, roll);
                  }}
                  ref={ref}
                  className="w-1/3"
                >
                  {roll.diceTypes.join(" + ")}{" "}
                  {roll.bonuses === null
                    ? ""
                    : signedModifierString(roll.bonuses)}
                </Button>
              );
            })}
          </p>
        </div>
      </div>
    </>
  );
}
