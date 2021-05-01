import React, { Suspense, useState } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { DiceGeometry } from "./Dice";
import * as THREE from "three";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import d12Glb from "./dice/d12.glb";

export function DebugDiceRotation() {
  const [die] = useLoader(GLTFLoader, [d12Glb]);

  const geometryFrom = (die: GLTF | undefined) => {
    return die ? (die.scene.children[0]! as THREE.Mesh).geometry : undefined;
  };

  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [z, setZ] = useState(0);

  return (
    <div>
      <input
        type="range"
        value={x}
        min={-Math.PI * 2}
        max={Math.PI * 2}
        step="any"
        onChange={(e) => setX(e.target.valueAsNumber)}
      />
      <input
        type="range"
        value={y}
        min={-Math.PI * 2}
        max={Math.PI * 2}
        step="any"
        onChange={(e) => setY(e.target.valueAsNumber)}
      />
      <input
        type="range"
        value={z}
        min={-Math.PI * 2}
        max={Math.PI * 2}
        step="any"
        onChange={(e) => setZ(e.target.valueAsNumber)}
      />
      <button onClick={() => alert(`new THREE.Euler(${x}, ${y}, ${z})`)}>
        show
      </button>
      <Canvas
        style={{ width: "384px", height: "60px" }}
        orthographic
        camera={{ near: 0.1, far: 10, zoom: 50 }}
      >
        <ambientLight />
        <pointLight position={[10, 10, 10]} intensity={2} />
        <Suspense fallback={null}>
          <DiceGeometry
            numFaces={20}
            geometry={geometryFrom(die)}
            finalRotation={new THREE.Quaternion().setFromEuler(
              new THREE.Euler(x, y, z)
            )}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
