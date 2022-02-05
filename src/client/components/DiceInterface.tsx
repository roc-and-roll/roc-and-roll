import React, { useState } from "react";
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
      <div id="pane">
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
                  {[4, 6, 8, 10, 12].map((dice) => (
                    <Button
                      key={dice}
                      onClick={() => addDiceType(`d${dice}`)}
                      className="w-full"
                    >
                      d{dice}
                    </Button>
                  ))}
                  <div className="flex">
                    <Button
                      className="w-2/5"
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
                <td className="flex flex-wrap flex-col h-[182px]">
                  {[-1, -2, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((bonus) => (
                    <Button
                      className="h-1/6 w-1/2 flex-1"
                      key={bonus}
                      onClick={() => addBonus(bonus)}
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
