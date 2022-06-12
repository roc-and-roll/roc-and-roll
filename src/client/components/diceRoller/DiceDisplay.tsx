import React, { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { colorForDamageType, RRLogEntryDiceRoll } from "../../../shared/state";
import { Dice } from "./Dice";
import clsx from "clsx";
import { contrastColor } from "../../util";
import { RRDamageType } from "../../../shared/dice-roll-tree-types-and-validation";
import { RollSlots, SlotsVisitor } from "./SlotsVisitor";

const SLOT_SIZE = 50;
const COLUMNS = 7;
export const DICE_DISPLAY_COLUMNS = COLUMNS;

const indexToXY = (i: number) => ({
  x: i % COLUMNS,
  y: Math.floor(i / COLUMNS),
});

function DiceContainer({
  slots,
  numRows,
  onAnimationFinished,
}: {
  slots: RollSlots;
  numRows: number;
  onAnimationFinished: () => void;
}) {
  const adjustPositions = ({ x, y }: { x: number; y: number }) => ({
    x,
    y: -y + (numRows - 1) / 2,
  });

  const finishedCountRef = useRef<number>(
    slots.length - slots.filter((s) => s.type === "die").length
  );

  const handleAnimationFinished = () => {
    finishedCountRef.current++;
    if (finishedCountRef.current === slots.length) {
      onAnimationFinished();
    }
  };

  // check once at the start
  useEffect(() => {
    if (finishedCountRef.current === slots.length) {
      onAnimationFinished();
    }
  }, [onAnimationFinished, slots.length]);

  return (
    <>
      {slots.flatMap((part, i) =>
        part.type === "die" ? (
          <Dice
            used={part.used}
            color={part.color}
            key={i}
            result={part.result}
            faces={part.faces}
            onAnimationFinished={handleAnimationFinished}
            {...adjustPositions(indexToXY(i))}
          />
        ) : (
          []
        )
      )}
    </>
  );
}

function ModifierContainer({ slots }: { slots: RollSlots }) {
  const SPACING = 5;
  const css = ({ x, y }: { x: number; y: number }, type: RRDamageType) => {
    const color = colorForDamageType(type.type);
    return {
      left: x * SLOT_SIZE + SPACING,
      top: y * SLOT_SIZE + SPACING,
      width: SLOT_SIZE - SPACING * 2,
      height: SLOT_SIZE - SPACING * 2,
      color: contrastColor(color),
      borderRadius: "5px",
      backgroundColor: color,
    };
  };

  return (
    <div
      className="dice-display-modifiers"
      style={{ width: SLOT_SIZE * COLUMNS }}
    >
      {slots.flatMap((part, i) =>
        part.type === "modifier" ? (
          <div
            key={i}
            className="modifier"
            style={css(indexToXY(i), part.damageType)}
          >
            {part.modifier < 0 ? part.modifier : `+${part.modifier}`}
          </div>
        ) : part.type === "weirdDie" ? (
          <div
            key={i}
            className={clsx("weird-die", part.used ? "used" : "unused")}
            style={css(indexToXY(i), part.damageType)}
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

export default function DiceDisplay({
  diceRoll,
  onAnimationFinished,
}: {
  diceRoll: RRLogEntryDiceRoll;
  onAnimationFinished: () => void;
}) {
  const slots = new SlotsVisitor().visit(diceRoll.payload.diceRollTree);
  const numRows = Math.ceil(slots.length / COLUMNS);

  return (
    <div className="dice-display">
      <Canvas
        style={{
          width: SLOT_SIZE * COLUMNS,
          height: SLOT_SIZE * numRows,
        }}
        camera={{
          fov: 10,
          aspect: (SLOT_SIZE * COLUMNS) / (SLOT_SIZE * numRows),
          near: 0.1,
          position: new THREE.Vector3(0, 2, 6 * numRows),
          far: 50,
        }}
        frameloop="demand"
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[4, 4, 10]} intensity={1} />
        <Suspense fallback={null}>
          <DiceContainer
            onAnimationFinished={onAnimationFinished}
            numRows={numRows}
            slots={slots}
          />
        </Suspense>
      </Canvas>
      <ModifierContainer slots={slots} />
    </div>
  );
}
