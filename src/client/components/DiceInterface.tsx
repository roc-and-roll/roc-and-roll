import React, { useState } from "react";
import { Button } from "./ui/Button";
import { diceTemplateAdd, logEntryDiceRollAdd } from "../../shared/actions";
import {
  RRDice,
  RRDiceTemplate,
  RRDiceTemplatePart,
  RRModifier,
} from "../../shared/state";
import { useMyself } from "../myself";
import { useServerDispatch } from "../state";
import { roll } from "../roll";
import { rrid } from "../../shared/util";

export function DiceInterface() {
  const [diceTypes, setDiceTypes] = useState<string[]>([]);
  const [boni, setBoni] = useState<number>(0);
  const myself = useMyself();
  const dispatch = useServerDispatch();

  const doRoll = (addTemplate: boolean) => {
    const boniString = boni >= 0 ? "+" + boni.toString() : boni.toString();
    const rollString = diceTypes.join("+") + boniString;

    const regex = /(^| *[+-] *)(?:(\d*)(d|a|i)(\d+)|(\d+))/g;
    const dice = [...rollString.matchAll(regex)].map(
      ([_, sign, diceCount, die, dieFaces, mod]): RRDice | RRModifier => {
        const negated = sign?.trim() === "-";
        if (diceCount !== undefined && dieFaces !== undefined) {
          // die
          const faces = parseInt(dieFaces);
          const count =
            diceCount === "" ? (die === "d" ? 1 : 2) : parseInt(diceCount);
          return roll({
            count,
            faces,
            modified:
              die === "a" ? "advantage" : die === "i" ? "disadvantage" : "none",
            negated,
            damage: {
              type: null,
              modifiers: [],
            },
          });
        } else if (mod) {
          // mod
          const modifier = parseInt(mod) * (negated ? -1 : 1);
          return {
            type: "modifier",
            damageType: {
              type: null,
              modifiers: [],
            },
            modifier,
          };
        }
        throw new Error();
      }
    );

    if (dice.length) {
      if (addTemplate) {
        dispatch(
          diceTemplateAdd({
            id: rrid<RRDiceTemplate>(),
            name: "",
            notes: "",
            parts: dice.flatMap<RRDiceTemplatePart>((d) =>
              d.type === "modifier"
                ? {
                    type: "modifier",
                    number: d.modifier,
                    damage: d.damageType,
                  }
                : {
                    type: "dice",
                    count: d.diceResults.length,
                    faces: d.faces,
                    modified: d.modified,
                    negated: d.negated,
                    damage: d.damageType,
                  }
            ),
            playerId: myself.id,
            rollType: "attack",
          })
        );
      } else {
        dispatch(
          logEntryDiceRollAdd({
            silent: false,
            playerId: myself.id,
            payload: { dice, rollType: null },
          })
        );
      }
      setDiceTypes([]);
      setBoni(0);
    } else {
      alert("Please follow the regex: " + regex.toString());
    }
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
      diceTypes[index] = newDiceType;
      setDiceTypes([...diceTypes]);
    } else {
      setDiceTypes([...diceTypes, diceType]);
    }
  }

  function addBonus(bonus: number) {
    setBoni((boni) => boni + bonus);
  }

  function clear() {
    setBoni(0);
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
              </tr>
              <tr>
                <td className="buttons-full-width">
                  <Button onClick={() => addDiceType("d4")}>d4</Button>
                  <Button onClick={() => addDiceType("d6")}>d6</Button>
                  <Button onClick={() => addDiceType("d8")}>d8</Button>
                  <Button onClick={() => addDiceType("d10")}>d10</Button>
                  <Button onClick={() => addDiceType("d12")}>d12</Button>
                  <Button
                    style={{ width: "40%" }}
                    onClick={() => addDiceType("d20")}
                  >
                    d20
                  </Button>
                  <Button
                    style={{ width: "30%", color: "green" }}
                    onClick={() => addDiceType("a20")}
                  >
                    Adv
                  </Button>
                  <Button
                    style={{ width: "30%", color: "red" }}
                    onClick={() => addDiceType("i20")}
                  >
                    Dis
                  </Button>
                </td>
                <td className="buttons-half-width">
                  <div>
                    <Button onClick={() => addBonus(-1)}>-1</Button>
                    <Button onClick={() => addBonus(1)}>+1</Button>
                    <Button onClick={() => addBonus(2)}>+2</Button>
                    <Button onClick={() => addBonus(3)}>+3</Button>
                    <Button onClick={() => addBonus(4)}>+4</Button>
                    <Button onClick={() => addBonus(10)}>+10</Button>
                  </div>
                  <div>
                    <Button onClick={() => addBonus(5)}>+5</Button>
                    <Button onClick={() => addBonus(6)}>+6</Button>
                    <Button onClick={() => addBonus(7)}>+7</Button>
                    <Button onClick={() => addBonus(8)}>+8</Button>
                    <Button onClick={() => addBonus(9)}>+9</Button>
                    <Button onClick={() => clear()}>DEL</Button>
                  </div>
                </td>

                <td>
                  <Button
                    className="add-template-button"
                    onClick={() => doRoll(true)}
                  >
                    <p>Template</p>
                  </Button>
                  <Button
                    className="roll-it-button"
                    onClick={() => doRoll(false)}
                  >
                    <p>ROLL IT</p>
                    <p>{diceTypes.join(" + ")}</p>
                    <div>
                      {boni >= 0 ? "+" + boni.toString() : boni.toString()}
                    </div>
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
