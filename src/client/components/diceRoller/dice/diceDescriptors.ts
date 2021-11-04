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
      rotations: [
        new THREE.Quaternion(
          0.3529512882232666,
          0.8105903267860413,
          0.0132218012586236,
          0.4671124219894409
        ),
        new THREE.Quaternion(
          0.0022970689460635185,
          -0.7659891843795776,
          0.5631842613220215,
          0.3099658787250519
        ),
        new THREE.Quaternion(
          -0.5878345370292664,
          0.30525219440460205,
          0.007600489072501659,
          -0.7491421103477478
        ),
        new THREE.Quaternion(
          -0.018537787720561028,
          0.46600449085235596,
          -0.3577190339565277,
          0.8090324401855469
        ),
        new THREE.Quaternion(
          0.35773831605911255,
          -0.8095217943191528,
          -0.018161749467253685,
          0.4651537537574768
        ),
        new THREE.Quaternion(
          -0.5631842613220215,
          -0.30996590852737427,
          0.002297093626111746,
          -0.7659891843795776
        ),
        new THREE.Quaternion(
          -0.007600514683872461,
          0.7491421103477478,
          -0.5878345370292664,
          0.30525216460227966
        ),
        new THREE.Quaternion(
          -0.013221785426139832,
          -0.46711239218711853,
          0.3529512882232666,
          0.8105903267860413
        ),
        new THREE.Quaternion(0, 1, 0, 0),
        new THREE.Quaternion(),
      ],
      geometry: () => geometryFrom(d10),
    },
    12: {
      rotations: [
        new THREE.Quaternion(),
        new THREE.Quaternion(
          0.29953885078430176,
          -0.43931183218955994,
          0.6800746917724609,
          0.5047574043273926
        ),
        new THREE.Quaternion(
          0.8166592717170715,
          -0.2633519172668457,
          -0.1668911725282669,
          -0.4856549799442291
        ),
        new THREE.Quaternion(
          0.006107878405600786,
          0.5425094366073608,
          -0.8400270938873291,
          0.0008632765966467559
        ),
        new THREE.Quaternion(
          0.4866119623184204,
          0.16753505170345306,
          -0.2637089192867279,
          0.8158421516418457
        ),
        new THREE.Quaternion(
          0.29506218433380127,
          0.4479895830154419,
          -0.6760421395301819,
          0.5051838159561157
        ),
        new THREE.Quaternion(
          -0.5051838159561157,
          -0.6760421395301819,
          -0.4479896128177643,
          0.2950621247291565
        ),
        new THREE.Quaternion(
          -0.8158421516418457,
          -0.2637089192867279,
          -0.16753506660461426,
          0.4866119921207428
        ),
        new THREE.Quaternion(
          0.0008632896351628006,
          0.8400270938873291,
          0.5425094366073608,
          -0.006107817869633436
        ),
        new THREE.Quaternion(
          0.4856550097465515,
          -0.1668911874294281,
          0.2633519172668457,
          0.8166592717170715
        ),
        new THREE.Quaternion(
          0.5047574043273926,
          -0.6800746917724609,
          -0.43931180238723755,
          -0.29953891038894653
        ),
        new THREE.Quaternion(1, 0, 0, 0),
      ],
      geometry: () => geometryFrom(d12),
    },
    20: {
      rotations: [
        new THREE.Quaternion(), // 1
        new THREE.Quaternion(
          0.8109013438224792,
          -0.47091349959373474,
          -0.17445534467697144,
          -0.3004078269004822
        ), // 2
        new THREE.Quaternion(
          -0.4954424500465393,
          0.2906680703163147,
          0.11452145874500275,
          -0.810514509677887
        ), // 3
        new THREE.Quaternion(
          -0.8027817606925964,
          0.11126435548067093,
          -0.29695242643356323,
          0.5049563646316528
        ), // 4
        new THREE.Quaternion(
          -0.0006139501929283142,
          -0.5729544162750244,
          0.6518905162811279,
          -0.49675118923187256
        ), // 5
        new THREE.Quaternion(
          -0.3107745945453644,
          -0.7550461888313293,
          -0.2858913242816925,
          0.5015881061553955
        ), // 6
        new THREE.Quaternion(
          0.31512749195098877,
          0.1828547567129135,
          -0.4733341634273529,
          0.8020060062408447
        ), // 7
        new THREE.Quaternion(
          0.005747894290834665,
          -0.93324214220047,
          -0.35919779539108276,
          -0.001718715182505548
        ), // 8
        new THREE.Quaternion(
          -0.4996757209300995,
          0.28695735335350037,
          -0.7578880190849304,
          -0.3059174418449402
        ), // 9
        new THREE.Quaternion(
          -0.5006498098373413,
          0.6453221440315247,
          0.5769825577735901,
          0.0005494662327691913
        ), // 10
        new THREE.Quaternion(
          -0.0005494443466886878,
          0.5769825577735901,
          -0.6453221440315247,
          -0.5006498098373413
        ), // 11
        new THREE.Quaternion(
          -0.3059174716472626,
          0.7578880190849304,
          0.286957323551178,
          0.4996757209300995
        ), // 12
        new THREE.Quaternion(
          0.001718658721074462,
          -0.35919779539108276,
          0.93324214220047,
          0.00574791943654418
        ), // 13
        new THREE.Quaternion(
          0.8064960241317749,
          0.46564263105392456,
          0.18586011230945587,
          -0.3133643567562103
        ), // 14
        new THREE.Quaternion(
          0.5041017532348633,
          0.28143537044525146,
          -0.757770299911499,
          0.30407172441482544
        ), // 15
        new THREE.Quaternion(
          0.500880241394043,
          0.648723304271698,
          0.5729467868804932,
          0.0030240104533731937
        ), // 16
        new THREE.Quaternion(
          0.507459282875061,
          0.2926546037197113,
          0.1044447273015976,
          0.8036974668502808
        ), // 17
        new THREE.Quaternion(
          -0.8116757869720459,
          -0.10597778856754303,
          0.285433292388916,
          0.4984765946865082
        ), // 18
        new THREE.Quaternion(
          -0.3004077970981598,
          0.17445538938045502,
          -0.47091346979141235,
          -0.8109013438224792
        ), // 19
        new THREE.Quaternion(1, 0, 0, 0), // 20
      ],
      geometry: () => geometryFrom(d20),
    },
  };
  return descriptors;
};
