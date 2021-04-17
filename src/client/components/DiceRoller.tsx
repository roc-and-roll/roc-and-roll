import * as THREE from "three";
import React, { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader";

const Dice: React.FC<
  JSX.IntrinsicElements["mesh"] & { verticesPerFace: number; numFaces: number }
> = (props) => {
  const mesh = useRef<THREE.Mesh>(null!);
  const velocity = useRef<number>(0);
  const [hovered, setHover] = useState(false);
  const [faceIndex, setFaceIndex] = useState(0);

  const [startRotation, setStartRotation] = useState(new THREE.Quaternion());
  const [endRotation, setEndRotation] = useState(new THREE.Quaternion());

  // const [finalRotation, setFinalRotation] = useState(new THREE.Quaternion());
  // const [rotationAxis, setRotationAxis] = useState(new THREE.Vector3());

  useFrame((state, delta) => {
    if (velocity.current > 0.1) {
      velocity.current *= 0.96;
      mesh.current.rotation.setFromQuaternion(
        startRotation.clone().slerp(endRotation, 1 - velocity.current)
      );
      // mesh.current.rotateOnAxis(rotationAxis, delta * velocity.current);
    } else {
      mesh.current.quaternion.rotateTowards(endRotation, delta * 3);
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

  /**
   * We have a long buffer of vertices and an index buffer that forms
   * faces from these vertices. Each face is a vertex. Here, we find all
   * vertices belong to a proper face of our die (so maybe a 5-gon) and
   * find their center.
   */
  const faceRotationsFrom = (
    geometry: THREE.BufferGeometry,
    numFaces: number
  ) => {
    const vertices = geometry.getAttribute("position")!;
    const vertexIndices = geometry.getIndex()!;

    const normals: THREE.Vector3[] = [];
    const hasVector = (v: THREE.Vector3) => {
      return normals.some((n) => n.equals(v));
    };

    for (let i = 0; i < vertexIndices.array.length; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(
        vertices,
        vertexIndices.array[i + 0]!
      );
      const b = new THREE.Vector3().fromBufferAttribute(
        vertices,
        vertexIndices.array[i + 1]!
      );
      const c = new THREE.Vector3().fromBufferAttribute(
        vertices,
        vertexIndices.array[i + 2]!
      );

      const e1 = new THREE.Vector3().subVectors(b, a);
      const e2 = new THREE.Vector3().subVectors(c, b);
      const n = new THREE.Vector3().crossVectors(e1, e2).normalize();
      if (!hasVector(n)) {
        normals.push(n);
      }
    }

    if (numFaces != normals.length) {
      console.log("expected", numFaces, "was", normals.length);
    }

    return normals;
  };

  const faceRotations = useMemo(() => {
    // props.numFaces === 6 && console.log( "my aray", faceRotationsFrom(props.geometry!, props.numFaces));
    return faceRotationsFrom(props.geometry!, props.numFaces).map((v) =>
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), v)
    );
  }, [props.geometry, props.numFaces]);

  return (
    <mesh
      {...props}
      ref={mesh}
      scale={2}
      quaternion={endRotation}
      onClick={(event) => {
        // setRotationAxis(randomAxis());
        velocity.current = 30;

        const r = faceRotations[faceIndex]!;
        setStartRotation(
          new THREE.Quaternion().setFromAxisAngle(randomAxis(), 10000)
        );
        setEndRotation(r);
        setFaceIndex((f) => (f + 1) % faceRotations.length);

        // setFinalRotation( new THREE.Quaternion().setFromEuler( new THREE.Euler( Math.random() * 2 * PI, Math.random() * 2 * PI, Math.random() * 2 * PI)));
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
    return die ? (die.scene.children[0]! as THREE.Mesh).geometry : undefined;
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
        <Dice
          numFaces={4}
          verticesPerFace={3}
          geometry={geometryFrom(d4)}
          position={[-12, 0, 0]}
        />
        <Dice
          numFaces={6}
          verticesPerFace={6}
          geometry={geometryFrom(d6)}
          position={[-7, 0, 0]}
        />
        <Dice
          numFaces={8}
          verticesPerFace={3}
          geometry={geometryFrom(d8)}
          position={[-2, 0, 0]}
        />
        <Dice
          numFaces={10}
          verticesPerFace={6}
          geometry={geometryFrom(d10)}
          position={[3, 0, 0]}
        />
        <Dice
          numFaces={12}
          verticesPerFace={9}
          geometry={geometryFrom(d12)}
          position={[8, 0, 0]}
        />
        <Dice
          numFaces={20}
          verticesPerFace={3}
          geometry={geometryFrom(d20)}
          position={[13, 0, 0]}
        />
      </Suspense>
    </Canvas>
  );
};
