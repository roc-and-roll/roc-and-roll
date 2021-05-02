import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { RRLogEntryDiceRoll } from "../../../shared/state";
import { Dice } from "./Dice";
import clsx from "clsx";

const SLOT_SIZE = 50;
const COLUMNS = 7;
export const DICE_DISPLAY_COLUMNS = COLUMNS;

interface DisplayPart {
  type: string;
}
interface DisplayModifier extends DisplayPart {
  type: "modifier";
  modifier: number;
}
interface DisplayDie extends DisplayPart {
  type: "die";
  faces: number;
  result: number;
  used: boolean;
}
interface DisplayWeirdDie extends DisplayPart {
  type: "weirdDie";
  faces: number;
  result: number;
  used: boolean;
}

type RollSlots = (DisplayDie | DisplayModifier | DisplayWeirdDie)[];

const indexToXY = (i: number) => ({
  x: i % COLUMNS,
  y: Math.floor(i / COLUMNS),
});

function DiceContainer({
  slots,
  numRows,
}: {
  slots: RollSlots;
  numRows: number;
}) {
  const adjustPositions = ({ x, y }: { x: number; y: number }) => ({
    x,
    y: -y + (numRows - 1) / 2,
  });

  return (
    <>
      {slots.flatMap((part, i) =>
        part.type === "modifier" ? (
          []
        ) : (
          <Dice
            used={part.used}
            key={i}
            result={part.result}
            faces={part.faces}
            {...adjustPositions(indexToXY(i))}
          />
        )
      )}
    </>
  );
}

function ModifierContainer({ slots }: { slots: RollSlots }) {
  const SPACING = 3;
  const cssOffsetFromSlot = ({ x, y }: { x: number; y: number }) => {
    return {
      left: x * SLOT_SIZE + SPACING,
      top: y * SLOT_SIZE + SPACING,
      width: SLOT_SIZE - SPACING * 2,
      height: SLOT_SIZE - SPACING * 2,
    };
  };

  return (
    <div
      className="dice-display-modifiers"
      style={{ width: SLOT_SIZE * COLUMNS }}
    >
      {slots.flatMap((part, i) =>
        part.type === "modifier" ? (
          <div className="modifier" style={cssOffsetFromSlot(indexToXY(i))}>
            {part.modifier < 0 ? part.modifier : `+${part.modifier}`}
          </div>
        ) : part.type === "weirdDie" ? (
          <div
            className={clsx("weird-die", part.used ? "used" : "unused")}
            style={cssOffsetFromSlot(indexToXY(i))}
          >
            <div className="weird-die-result">{part.result}</div>
            <div className="weird-die-faces">{part.faces}</div>
          </div>
        ) : (
          []
        )
      )}
    </div>
  );
}

const calculateSlots = (diceRoll: RRLogEntryDiceRoll) => {
  const slots: RollSlots = [];
  for (const part of diceRoll.payload.dice) {
    if (part.type === "modifier") slots.push(part);
    else {
      for (const result of part.diceResults) {
        slots.push({
          type: [4, 6, 8, 10, 12, 20].includes(part.faces) ? "die" : "weirdDie",
          faces: part.faces,
          result: result,
          used:
            part.modified === "none"
              ? true
              : part.modified === "advantage"
              ? result === Math.max(...part.diceResults)
              : result === Math.min(...part.diceResults),
        });
      }
    }
  }
  return slots;
};

export default function DiceDisplay({
  diceRoll,
}: {
  diceRoll: RRLogEntryDiceRoll;
}) {
  const slots = calculateSlots(diceRoll);
  const numRows = Math.ceil(slots.length / COLUMNS);

  return (
    <div className="dice-display">
      <Canvas
        style={{
          width: SLOT_SIZE * COLUMNS,
          height: SLOT_SIZE * numRows,
        }}
        orthographic
        camera={{
          near: 0.1,
          far: 10,
          zoom: 50,
        }}
      >
        <ambientLight />
        <pointLight position={[10, 10, 10]} intensity={2} />
        <Suspense fallback={null}>
          <DiceContainer numRows={numRows} slots={slots} />
        </Suspense>
      </Canvas>
      <ModifierContainer slots={slots} />
    </div>
  );
}