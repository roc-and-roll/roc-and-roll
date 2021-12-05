import React, { useState } from "react";
import { Button } from "./ui/Button";
import {
  logEntryDiceRollAdd,
  playerAddDiceTemplate,
  playerAddDiceTemplateCategory,
} from "../../shared/actions";
import { useMyProps } from "../myself";
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
  const [boni, setBoni] = useState<number | null>(null);
  const myself = useMyProps("id", "diceTemplateCategories");
  const dispatch = useServerDispatch();
  const alert = useAlert();
  const prompt = usePrompt();

  const doRoll = async (addTemplate: boolean) => {
    const boniString =
      boni === null ? "" : boni >= 0 ? "+" + boni.toString() : boni.toString();
    const rollString = diceTypes.join("+") + boniString;

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
      if (myself.diceTemplateCategories.length < 1) {
        const newTemplateCategoryAction = playerAddDiceTemplateCategory({
          id: myself.id,
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
        categoryId = myself.diceTemplateCategories[0]!.id;
      }
      dispatch(
        playerAddDiceTemplate({
          id: myself.id,
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
            diceRollTree: rollDiceRollTree(diceRollTree),
            rollType: null,
            rollName: null,
          },
        })
      );
    }
    setDiceTypes([]);
    setBoni(null);
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
    setBoni((boni) => (boni ?? 0) + bonus);
  }

  function clear() {
    setBoni(null);
    setDiceTypes([]);
  }

  return (
    <>
      <div id="pane">
        <div>
          <table
            style={{
              width: "100%",
              height: "100%",
              border: "1px lightgray solid",
            }}
          >
            <tbody>
              <tr>
                <th style={{ width: "33%" }}>Type</th>
                <th style={{ width: "33%" }}>Bonus</th>
                <th />
              </tr>
              <tr>
                <td className="buttons-full-width">
                  {[4, 6, 8, 10, 12].map((dice) => (
                    <Button key={dice} onClick={() => addDiceType(`d${dice}`)}>
                      d{dice}
                    </Button>
                  ))}
                  <div style={{ display: "flex" }}>
                    <Button
                      style={{ width: "40%" }}
                      onClick={() => addDiceType("d20")}
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
                <td className="buttons-half-width">
                  <div>
                    <Button onClick={() => addBonus(-2)}>-2</Button>
                    <Button onClick={() => addBonus(-1)}>-1</Button>
                    <Button onClick={() => addBonus(1)}>+1</Button>
                    <Button onClick={() => addBonus(2)}>+2</Button>
                    <Button onClick={() => addBonus(3)}>+3</Button>
                    <Button onClick={() => addBonus(4)}>+4</Button>
                  </div>
                  <div>
                    {[5, 6, 7, 8, 9, 10].map((bonus) => (
                      <Button key={bonus} onClick={() => addBonus(bonus)}>
                        +{bonus}
                      </Button>
                    ))}
                  </div>
                </td>

                <td className="buttons-full-width">
                  <Button onClick={() => doRoll(true)}>
                    <p>Template</p>
                  </Button>
                  <Button
                    className="roll-it-button"
                    onClick={() => doRoll(false)}
                    disabled={boni === null && diceTypes.length === 0}
                  >
                    <p>ROLL IT</p>
                    <p>{diceTypes.join(" + ")}</p>
                    <div>
                      {boni === null
                        ? ""
                        : boni >= 0
                        ? "+" + boni.toString()
                        : boni.toString()}
                    </div>
                  </Button>
                  <Button onClick={() => clear()}>Clear Input</Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
