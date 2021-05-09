import React, { useState } from "react";
import { logEntryDiceRollAdd } from "../../shared/actions";
import { RRDice, RRModifier } from "../../shared/state";
import { useMyself } from "../myself";
import { useServerDispatch } from "../state";
// import { roll } from "../roll";
import { Button } from "./ui/Button";

export function DiceInterface() {
  const [roll, setRoll] = useState("");
  const [bonus, setBonus] = useState([]);
  const [previousRolls, setPreviousRolls] = useState([]);
  const [types, setTypes] = useState(["d4", "d6", "d8", "d10", "d12", "d20"]);
  const [boni, setBoni] = useState(["-1", "+0", "+1", "+2", "+3", "+4"]);
  const [currentRoll, setCurrentRoll] = useState([[]]);
  const [output, setOutput] = useState("");
  const [result, setResult] = useState("");
  // const myself = useMyself();
  // const dispatch = useServerDispatch();

  const doRoll = () => {
    const regex = /(^| *[+-] *)(?:(\d*)d(\d+)|(\d+))/g;
    const matchArray = [...roll.matchAll(regex)];
    const diceResults: number[] = matchArray.map((array) => {
      const sign = array[1]?.trim() === "-" ? -1 : 1;
      if (array[2] !== undefined && array[3] !== undefined) {
        // die
        const faces = parseInt(array[3]);
        const count = array[2] === "" ? 1 : parseInt(array[2]);
        let result = 0;
        for (let i = 1; i <= count; i++) {
          result += Math.floor(Math.random() * faces) + 1;
        }
        result *= sign;
        return result;
      } else if (array[4]) {
        // mod
        const modifier = parseInt(array[4]) * sign;
        return modifier;
      } else {
        return 0;
      }
    })
    setResult("" + diceResults.join("+") + "=" + diceResults.reduce((acc, val) => acc + val)?.toString());
    setOutput(output + " | " + roll);
    setCurrentRoll([[]]);
    var filteredRolls: string[] = previousRolls.filter(e => e != roll);
    // setPreviousRolls(previousRolls.filter(e => e != roll));  
    filteredRolls.unshift(roll);
    if (previousRolls.length > 20) {previousRolls.pop()}
    // return result
  };

  return (
    <>
      <div id="pane">
        <div style={{width: "66%"}}>
          <table style={{width:"100%", height:"100%"; border: "1px lightgray solid"}}>
            <tr>
              <th style={{width:"33%"}}>Type</th>
              <th style={{width:"33%"}}>Bonus</th>
            </tr>
            <tr>
              <td>{type}</td>
              <td>{bonus}</td>
              <td>
                <Button 
                  onClick={doRoll}
                  style={{width: "100%", height: "150px"}} 
                >
                <p>ROLL IT</p><div>{currentRoll.map(roll => roll).join("|\n")}</div></Button>
              </td>
            </tr>
          </table>
          <div><span>Roll: </span> 
            <input 
              value={output}
              onChange={(evt) => setOutput(evt.target.value)}
            />
            <span>Result: </span> 
            <input 
              value={result}
              onChange={(evt) => setResult(evt.target.value)}
            />
          </div>
        </div>
        <div>
          <div>Previous Rolls: </div>
          {previousRolls}
        </div>
      </div>
    </>
  );
}
