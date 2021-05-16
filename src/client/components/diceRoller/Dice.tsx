import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import diceFaces from "./dice/dice-faces.png";
import d4Glb from "./dice/d4.glb";
import d6Glb from "./dice/d6.glb";
import d8Glb from "./dice/d8.glb";
import d10Glb from "./dice/d10.glb";
import d12Glb from "./dice/d12.glb";
import d20Glb from "./dice/d20.glb";
import { useFrame, useLoader } from "@react-three/fiber";
import { descriptorMap } from "./dice/diceDescriptors";
import { DICE_DISPLAY_COLUMNS } from "./DiceDisplay";

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
    used: boolean;
    finalRotation: THREE.Quaternion;
    color: string;
    onAnimationFinished?: () => void;
  }
> = ({
  finalRotation,
  used,
  numFaces,
  color,
  onAnimationFinished,
  ...meshProps
}) => {
  const startVelocity = 30;

  const mesh = useRef<THREE.Mesh>(null!);
  const velocity = useRef<number>(startVelocity);
  const animationFinished = useRef<boolean>(false);

  const speed = useMemo(() => (Math.random() - 0.25) * 0.08, []);
  const startRotation = useMemo(
    () => new THREE.Quaternion().setFromAxisAngle(randomAxis(), 10000),
    []
  );

  useFrame((_, delta) => {
    if (animationFinished.current) return;

    if (velocity.current > 0.1) {
      velocity.current *= 0.9 + speed;
      mesh.current.rotation.setFromQuaternion(
        startRotation.clone().slerp(finalRotation, 1 - velocity.current)
      );
    } else {
      mesh.current.quaternion.rotateTowards(finalRotation, delta * 4);
      if (mesh.current.quaternion.angleTo(finalRotation) < 0.001) {
        mesh.current.rotation.setFromQuaternion(finalRotation);
        animationFinished.current = true;
        onAnimationFinished?.();
      }
    }
  });

  const [image] = useLoader(THREE.TextureLoader, [diceFaces]);
  image && (image.flipY = false);

  return (
    <mesh {...meshProps} ref={mesh} scale={0.7} quaternion={finalRotation}>
      <meshStandardMaterial
        map={image}
        color={used && animationFinished.current ? color : "gray"}
      />
    </mesh>
  );
};

export function Dice({
  faces,
  result,
  x,
  y,
  used,
  color,
  onAnimationFinished,
}: {
  faces: number;
  result: number;
  x: number;
  y: number;
  used: boolean;
  color: string;
  onAnimationFinished?: () => void;
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
        used={used}
        onAnimationFinished={onAnimationFinished}
        numFaces={faces}
        color={color}
        geometry={descriptor.geometry()}
        position={[x - (DICE_DISPLAY_COLUMNS - 1) / 2, y, 0]}
      />
    );
  } else {
    return <></>;
  }
}
