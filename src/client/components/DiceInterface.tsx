import React, { useState } from "react";
import { Button } from "./ui/Button";

export function DiceInterface() {
  const [diceTypes, setDiceTypes] = useState<string[]>([]);
  const [boni, setBoni] = useState<number>(0);

  function addDiceType(diceType: string) {
    const index = diceTypes.findIndex((element) => element.includes(diceType));
    if (index >= 0) {
      const diceInfo = diceTypes[index]?.split("d");
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
      const newDiceType = `${newCount}d${diceInfo[1]!}`;
      diceTypes[index] = newDiceType;
      setDiceTypes([...diceTypes]);
    } else {
      setDiceTypes([...diceTypes, diceType]);
    }
  }

  function addBonus(bonus: number) {
    const num = boni + bonus;
    setBoni(num);
  }

  return (
    <>
      <div id="pane">
        <div style={{ width: "66%" }}>
          <table
            style={{
              width: "100%",
              height: "100%",
              border: "1px lightgray solid",
            }}
          >
            <tr>
              <th style={{ width: "33%" }}>Type</th>
              <th style={{ width: "33%" }}>Bonus</th>
            </tr>
            <tr>
              <td>
                <Button onClick={() => addDiceType("d4")}>d4</Button> <br />
                <Button onClick={() => addDiceType("d6")}>d6</Button> <br />
                <Button onClick={() => addDiceType("d8")}>d8</Button> <br />
                <Button onClick={() => addDiceType("d10")}>d10</Button> <br />
                <Button onClick={() => addDiceType("d12")}>d12</Button> <br />
                <Button onClick={() => addDiceType("d20")}>d20</Button>
              </td>
              <td>
                <td>
                  <Button onClick={() => addBonus(-1)}>-1</Button> <br />
                  <Button onClick={() => addBonus(1)}>+1</Button> <br />
                  <Button onClick={() => addBonus(2)}>+2</Button> <br />
                  <Button onClick={() => addBonus(3)}>+3</Button> <br />
                  <Button onClick={() => addBonus(4)}>+4</Button> <br />
                </td>
                <td>
                  <Button onClick={() => addBonus(5)}>+5</Button> <br />
                  <Button onClick={() => addBonus(6)}>+6</Button> <br />
                  <Button onClick={() => addBonus(7)}>+7</Button> <br />
                  <Button onClick={() => addBonus(8)}>+8</Button> <br />
                  <Button onClick={() => addBonus(9)}>+9</Button>
                </td>
              </td>

              <td>
                <Button style={{ width: "100%", height: "150px" }}>
                  <p>ROLL IT</p>
                  <p>{diceTypes.join("+")}</p>
                  <div>
                    {boni >= 0 ? "+" + boni.toString() : boni.toString()}
                  </div>
                </Button>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </>
  );
}
