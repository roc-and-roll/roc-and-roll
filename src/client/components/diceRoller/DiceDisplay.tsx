import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { RRLogEntryDiceRoll } from "../../../shared/state";
import { Dice } from "./Dice";

function DiceContainer({ diceRoll }: { diceRoll: RRLogEntryDiceRoll }) {
  return (
    <>
      {diceRoll.payload.dice.flatMap((part) =>
        part.type === "modifier" ? (
          <></>
        ) : (
          part.diceResults.map((r, i) => (
            <Dice key={i} result={r} faces={part.faces} index={i} />
          ))
        )
      )}
    </>
  );
}

export default function DiceDisplay({
  diceRoll,
}: {
  diceRoll: RRLogEntryDiceRoll;
}) {
  return (
    <Canvas
      style={{ width: "384px", height: "60px" }}
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
        <DiceContainer diceRoll={diceRoll} />
      </Suspense>
    </Canvas>
  );
}
