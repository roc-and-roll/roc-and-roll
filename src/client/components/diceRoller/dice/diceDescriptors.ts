import * as THREE from "three";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

interface DiceDescriptor {
  geometry: () => THREE.BufferGeometry | undefined;
  rotations: THREE.Quaternion[];
}

const geometryFrom = (die: GLTF | undefined) => {
  return die ? (die.scene.children[0]! as THREE.Mesh).geometry : undefined;
};

const anglesToQuaternion = (angles: [number, number, number][]) =>
  angles.map((n) =>
    new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        THREE.MathUtils.degToRad(n[0]),
        THREE.MathUtils.degToRad(n[1]),
        THREE.MathUtils.degToRad(n[2])
      )
    )
  );

export const descriptorMap = ([d4, d6, d8, d10, d12, d20]: GLTF[]): {
  [faces: string]: DiceDescriptor;
} => {
  const r = (x: number, y: number, z: number, d: number) =>
    new THREE.Matrix4().makeRotationAxis(
      new THREE.Vector3(x, y, z),
      THREE.MathUtils.degToRad(d)
    );

  // TODO: can be arbitrary die or d100
  const descriptors: { [id: string]: DiceDescriptor } = {
    4: {
      rotations: [
        new THREE.Quaternion(),
        new THREE.Quaternion(
          0.7124677300453186,
          0.29332807660102844,
          -0.4051455557346344,
          0.4921437203884125
        ),
        new THREE.Quaternion(
          0.7085079550743103,
          0.28753891587257385,
          -0.40955063700675964,
          -0.4976005554199219
        ),
        new THREE.Quaternion(
          0.00023272153339348733,
          -0.29141682386398315,
          -0.8161157369613647,
          0.49903035163879395
        ),
      ],
      geometry: () => geometryFrom(d4),
    },
    6: {
      rotations: anglesToQuaternion([
        [90, 180, 0],
        [180, 0, -90],
        [-90, 180, 90],
        [90, 180, 90],
        [-180, 180, 90],
        [90, 180, 180],
      ]),
      geometry: () => geometryFrom(d6),
    },
    8: {
      rotations: anglesToQuaternion([
        [30, 90, 0],
        [30, 180, -180],
        [30, 180, 0],
        [30, -90, -180],
        [30, -90, 0],
        [30, 0, -180],
        [30, 0, 0],
        [30, 90, 180],
      ]),
      geometry: () => geometryFrom(d8),
    },
    10: {
      rotations: (() => {
        const upper = r(1, 0, 0, 45);
        const lower = r(1, 0, 0, -45 - 10);
        const rotated = (base: THREE.Matrix4, offset: number) =>
          base.clone().multiply(r(0, 1, 0, 36 * offset));
        return [
          rotated(upper, 9),
          rotated(lower, 2),
          rotated(upper, 5),
          rotated(lower, 8),
          rotated(upper, 3),
          rotated(lower, 0),
          rotated(upper, 7),
          rotated(lower, 4),
          rotated(upper, 1),
          rotated(lower, 6),
        ].map((m) => new THREE.Quaternion().setFromRotationMatrix(m));
      })(),
      geometry: () => geometryFrom(d10),
    },
    12: {
      rotations: (() => {
        const m = (m: THREE.Matrix4) =>
          new THREE.Quaternion().setFromRotationMatrix(m);
        const e = (m: THREE.Euler) => new THREE.Quaternion().setFromEuler(m);
        return [
          m(r(1, 0, 0, 30)), // 1
          e(new THREE.Euler(4.18879020478, 2.52771822702, 5.05543645405)), // 2
          m(r(1, 0, 0, -90).multiply(r(0, 0, 1, 36)).multiply(r(0, 1, 0, 20))), // 3
          m(r(1, 0, 0, 210).multiply(r(0, 1, 0, 180))), // 4
          e(new THREE.Euler(1.51663093621, 5.99430322409, 5.705421141)), // 5
          m(r(1, 0, 0, -210)), // 6
          e(new THREE.Euler(4.04434916324, -0.5777641661, 4.47767228787)), // 7
          e(new THREE.Euler(4.76655437096, -0.288882083, -0.5055436454)),
          m(r(1, 0, 0, 30).multiply(r(0, 1, 0, 180))), // 9
          m(r(1, 0, 0, 90).multiply(r(0, 0, 1, 30)).multiply(r(0, 1, 0, 20))), // 10
          e(new THREE.Euler(1.0110872908, 2.527718227, 5.055436454)), // 11
          m(r(1, 0, 0, 210)), // 12
        ];
      })(),
      geometry: () => geometryFrom(d12),
    },
    20: {
      rotations: [
        new THREE.Euler(-0.14159265358, 2.12840734641, -0.03159265358), // 1
        new THREE.Euler(-1.51318530717, -3.68318530717, -1.51318530717), // 2
        new THREE.Euler(1.11840734641021, 1.58840734641021, -0.251592653589793), // 3
        new THREE.Euler(-2.24318530717, -3.54318530717, -0.07318530717), // 4
        new THREE.Euler(-0.36159265358, -2.27159265358, 0.93840734641), // 5
        new THREE.Euler(-2.81660031011499, -3.17770291397588, 2.0943951023932), // 6
        new THREE.Euler(-3.1415926535, 0.28840734641, -2.0615926535), // 7
        new THREE.Euler(1.18840734641, -0.9015926535, 0.06840734641), // 8
        new THREE.Euler(-3.68324655938, -3.24992343474, -1.01108729081), // 9
        new THREE.Euler(1.91840734641, -0.0315926535, 0.57840734641), // 10
        new THREE.Euler(-1.0815926535, -0.0015926535, 0.42840734641), // 11
        new THREE.Euler(-0.86664624926, -2.45549770625, -1.44441041544), // 12
        new THREE.Euler(-2.0915926535, -0.9715926535, 0.06840734641), // 13
        new THREE.Euler(-0.0715926535, 0.28840734641, -1.9815926535), // 14
        new THREE.Euler(-2.67215926857063, 0, 5.27209801636908), // 15
        new THREE.Euler(-3.14159265358979, -2.20159265358979, 1.15840734641021), // 16
        new THREE.Euler(-2.31105666470973, 0.361102603860896, -3.1054823932037), // 17
        new THREE.Euler(-0.0715926535, 1.62840734641, -2.0215926535), // 18
        new THREE.Euler(1.65681469282041, -3.68318530717959, -1.37318530717959), // 19
        new THREE.Euler(2.88840734641021, 2.12840734641021, 0.068407346410207), // 20
      ].map((e) => new THREE.Quaternion().setFromEuler(e)),
      geometry: () => geometryFrom(d20),
    },
  };
  return descriptors;
};
