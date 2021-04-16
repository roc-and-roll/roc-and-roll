import * as THREE from "three";
import React, {
  cloneElement,
  Suspense,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader";

function getD4() {
  return new THREE.TetrahedronBufferGeometry();
}

function getD6() {
  return new THREE.BoxBufferGeometry();
}

function getD8() {
  return new THREE.OctahedronBufferGeometry();
}

function getD12() {
  return new THREE.DodecahedronBufferGeometry();
}

function getD20() {
  return new THREE.IcosahedronBufferGeometry();
}

function getD10() {
  const sides = 10;
  const radius = 1;

  const vertices = [
    [0, 0, 1],
    [0, 0, -1],
  ].flat();

  // https://github.com/byWulf/threejs-dice/blob/master/lib/dice.js#L499
  for (let i = 0; i < sides; ++i) {
    const b = (i * Math.PI * 2) / sides;
    vertices.push(-Math.cos(b), -Math.sin(b), 0.105 * (i % 2 ? 1 : -1));
  }

  const faces = [
    [0, 2, 3],
    [0, 3, 4],
    [0, 4, 5],
    [0, 5, 6],
    [0, 6, 7],
    [0, 7, 8],
    [0, 8, 9],
    [0, 9, 10],
    [0, 10, 11],
    [0, 11, 2],
    [1, 3, 2],
    [1, 4, 3],
    [1, 5, 4],
    [1, 6, 5],
    [1, 7, 6],
    [1, 8, 7],
    [1, 9, 8],
    [1, 10, 9],
    [1, 11, 10],
    [1, 2, 11],
  ].flat();

  return new THREE.PolyhedronGeometry(vertices, faces, radius, 0);
}

const Dice: React.FC<JSX.IntrinsicElements["mesh"]> = (props) => {
  const mesh = useRef<THREE.Mesh>(null!);
  const velocity = useRef<number>(0);
  const [hovered, setHover] = useState(false);

  const [finalRotation, setFinalRotation] = useState(new THREE.Quaternion());
  const [rotationAxis, setRotationAxis] = useState(new THREE.Vector3());

  useFrame((state, delta) => {
    if (velocity.current > 0.1) {
      velocity.current *= 0.96;
      mesh.current.rotateOnAxis(rotationAxis, delta * velocity.current);
    } else {
      // mesh.current.quaternion.rotateTowards(finalRotation, delta * 10);
    }
  });

  const [image] = useLoader(THREE.TextureLoader, ["/dice/dice-faces.png"]);
  image && (image.flipY = false);

  const randomAxis = () => {
    return new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    ).normalize();
  };

  return (
    <mesh
      {...props}
      ref={mesh}
      scale={2}
      onClick={(event) => {
        const PI = 3.14 * 10;
        setRotationAxis(randomAxis());
        velocity.current = 30;
        setFinalRotation(
          new THREE.Quaternion().setFromEuler(
            new THREE.Euler(
              Math.random() * 2 * PI,
              Math.random() * 2 * PI,
              Math.random() * 2 * PI
            )
          )
        );
      }}
      onPointerOver={(event) => setHover(true)}
      onPointerOut={(event) => setHover(false)}
    >
      <meshStandardMaterial
        map={image}
        color={hovered ? "hotpink" : "orange"}
      />
    </mesh>
  );
};

export const DiceRoller: React.FC = () => {
  /*const d4 = useMemo(() => getD4(), []);
  const d6 = useMemo(() => getD6(), []);
  const d8 = useMemo(() => getD8(), []);
  const d10 = useMemo(() => getD10(), []);
  const d12 = useMemo(() => getD12(), []);
  const d20 = useMemo(() => getD20(), []);*/

  const [d4, d6, d8, d10, d12, d20] = useLoader(GLTFLoader, [
    "/dice/d4.glb",
    "/dice/d6.glb",
    "/dice/d8.glb",
    "/dice/d10.glb",
    "/dice/d12.glb",
    "/dice/d20.glb",
  ]);

  const geometryFrom = (die: GLTF | undefined) => {
    return die
      ? (die.scene.children[0]! as THREE.Mesh).clone().geometry
      : undefined;
  };

  return (
    <Canvas
      style={{ width: "1500px", height: "400px" }}
      orthographic
      camera={{ near: 0.1, far: 20, zoom: 50 }}
    >
      <ambientLight />
      <pointLight position={[10, 10, 10]} intensity={2} />
      <Suspense fallback={null}>
        <Dice geometry={geometryFrom(d4)} position={[-12, 0, 0]} />
        <Dice geometry={geometryFrom(d6)} position={[-7, 0, 0]} />
        <Dice geometry={geometryFrom(d8)} position={[-2, 0, 0]} />
        <Dice geometry={geometryFrom(d10)} position={[3, 0, 0]} />
        <Dice geometry={geometryFrom(d12)} position={[8, 0, 0]} />
        <Dice geometry={geometryFrom(d20)} position={[13, 0, 0]} />
      </Suspense>
    </Canvas>
  );
};
