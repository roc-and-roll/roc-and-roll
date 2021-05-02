import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import diceFaces from "./dice/dice-faces.png";
import d4Glb from "./dice/d4.glb";
import d6Glb from "./dice/d6.glb";
import d8Glb from "./dice/d8.glb";
import d10Glb from "./dice/d10.glb";
import d12Glb from "./dice/d12.glb";
import d20Glb from "./dice/d20.glb";
import { useFrame, useLoader } from "@react-three/fiber";
import { descriptorMap } from "./dice/diceDescriptors";

const randomAxis = () => {
  return new THREE.Vector3(
    Math.random() * 2 - 1,
    Math.random() * 2 - 1,
    Math.random() * 2 - 1
  ).normalize();
};

export const DiceGeometry: React.FC<
  JSX.IntrinsicElements["mesh"] & {
    numFaces: number;
    finalRotation: THREE.Quaternion;
  }
> = (props) => {
  const startVelocity = 30;

  const mesh = useRef<THREE.Mesh>(null!);
  const velocity = useRef<number>(startVelocity);

  const speed = useMemo(() => (Math.random() - 0.25) * 0.03, []);
  const startRotation = useMemo(
    () => new THREE.Quaternion().setFromAxisAngle(randomAxis(), 10000),
    []
  );
  const endRotation = props.finalRotation;

  useFrame((state, delta) => {
    if (velocity.current > 0.1) {
      velocity.current *= 0.96 + speed;
      mesh.current.rotation.setFromQuaternion(
        startRotation.clone().slerp(endRotation, 1 - velocity.current)
      );
    } else {
      mesh.current.quaternion.rotateTowards(endRotation, delta * 4);
      if (mesh.current.quaternion.angleTo(endRotation) < 0.001) {
        mesh.current.rotation.setFromQuaternion(endRotation);
      }
    }
  });

  const [image] = useLoader(THREE.TextureLoader, [diceFaces]);
  image && (image.flipY = false);

  return (
    <mesh {...props} ref={mesh} scale={0.7} quaternion={endRotation}>
      <meshStandardMaterial map={image} color={"orange"} />
    </mesh>
  );
};

export function Dice({
  faces,
  result,
  index,
}: {
  faces: number;
  result: number;
  index: number;
}) {
  const dice = useLoader(GLTFLoader, [
    d4Glb,
    d6Glb,
    d8Glb,
    d10Glb,
    d12Glb,
    d20Glb,
  ]);
  const descriptor = descriptorMap(dice)[faces.toString()];

  if (descriptor) {
    return (
      <DiceGeometry
        finalRotation={descriptor.rotations[result - 1]!}
        numFaces={faces}
        geometry={descriptor.geometry()}
        position={[index - 3, 0, 0]}
      />
    );
  } else {
    return <></>;
  }
}
