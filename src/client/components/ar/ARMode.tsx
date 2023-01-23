import React, { useContext, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import io from "socket.io-client";
import { Matrix4 } from "three";
import marker1 from "./marker/stag_00001.png";
import marker2 from "./marker/stag_00002.png";
import marker3 from "./marker/stag_00003.png";
import marker4 from "./marker/stag_00004.png";
import { MapTransformRef } from "../MapTransformContext";
import { applyToPoint, inverse } from "transformation-matrix";
import { useServerDispatch, useServerStateRef } from "../../state";
import { useMyProps } from "../../myself";
import {
  makePoint,
  pointAdd,
  pointDistance,
  snapPointToGrid,
} from "../../../shared/point";
import { entries, RRCharacter, RRMapID, RRToken } from "../../../shared/state";
import {
  DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
  GRID_SIZE,
} from "../../../shared/constants";
import { mapObjectUpdate } from "../../../shared/actions";
import perspectiveTransform from "perspective-transform";

// cspell: words coeffs

type Corner = [number, number];
type Corners = [Corner, Corner, Corner, Corner];
interface Observation {
  time: Date;
  corners: Corners;
}

function center(points: Corners): Corner {
  return [
    points.reduce((acc, point) => acc + point[0], 0) / points.length,
    points.reduce((acc, point) => acc + point[1], 0) / points.length,
  ];
}

function matrixToCSS({ elements }: THREE.Matrix4) {
  return `matrix3d(
    ${elements[0]!},  ${elements[1]!},  ${elements[2]!},  ${elements[3]!},
    ${elements[4]!},  ${elements[5]!},  ${elements[6]!},  ${elements[7]!},
    ${elements[8]!},  ${elements[9]!},  ${elements[10]!}, ${elements[11]!},
    ${elements[12]!}, ${elements[13]!}, ${elements[14]!}, ${elements[15]!})`;
}

const toMatrix = (coeffs: ReturnType<typeof perspectiveTransform>["coeffs"]) =>
  new Matrix4().fromArray(
    // prettier-ignore
    [
      coeffs[0], coeffs[3], 0, coeffs[6],
      coeffs[1], coeffs[4], 0, coeffs[7],
      0,         0,         1, 0,
      coeffs[2], coeffs[5], 0, coeffs[8],
    ],
    0
  );

export const ARModeContext = React.createContext<{
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}>({
  enabled: false,
  setEnabled: () => {
    throw new Error("ARModeContextProvider is missing.");
  },
});

export function ARModeContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [enabled, setEnabled] = useState(false);
  return (
    <ARModeContext.Provider value={{ enabled, setEnabled }}>
      {children}
    </ARModeContext.Provider>
  );
}

const MS_TILL_MARKER_GONE = 1000;

export function ARMode() {
  const { enabled, setEnabled } = useContext(ARModeContext);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEnabled(params.get("ar") !== null);
  }, [setEnabled]);

  const [pointDict, setPointDict] = useState<Record<number, Observation>>({});
  const msgCounter = useRef(0);

  useEffect(() => {
    if (enabled) {
      // pointDict.current = {};
      msgCounter.current = 0;

      const socket = io("http://localhost:3377");
      socket.on(
        "points",
        (
          markers: Array<{
            id: number;
            points: Corners;
          }>
        ) => {
          msgCounter.current++;
          const cutoffTime = new Date(+new Date() - MS_TILL_MARKER_GONE);
          markers.forEach((marker) => {
            setPointDict((d) => {
              const calibrating = d[7] && d[7].time > cutoffTime;
              return marker.id <= 20 && (calibrating || marker.id > 6)
                ? {
                    ...d,
                    [marker.id]: { time: new Date(), corners: marker.points },
                  }
                : d;
            });
          });
        }
      );

      return () => {
        socket.disconnect();
      };
    }
  }, [enabled]);

  let transform1: ReturnType<typeof perspectiveTransform> | undefined;
  let transform2: ReturnType<typeof perspectiveTransform> | undefined;

  const cutoffTime = new Date(+new Date() - MS_TILL_MARKER_GONE);
  const calibrating = pointDict[7] && pointDict[7].time > cutoffTime;

  if (
    pointDict[1] &&
    pointDict[2] &&
    pointDict[3] &&
    pointDict[4] &&
    pointDict[5] &&
    pointDict[6]
  ) {
    const x = 0;
    const y = 0;
    const w = 1920;
    const h = 1080;
    const dstCorners = [x, y, w, y, x, h, w, h] as const;

    const srcCorners = [
      ...center(pointDict[5].corners),
      ...center(pointDict[6].corners),
      ...center(pointDict[3].corners),
      ...center(pointDict[4].corners),
    ] as const;
    const srcCorners2 = [
      ...center(pointDict[1].corners),
      ...center(pointDict[2].corners),
      ...center(pointDict[3].corners),
      ...center(pointDict[4].corners),
    ] as const;

    transform1 = perspectiveTransform(dstCorners, srcCorners);
    transform2 = perspectiveTransform(dstCorners, srcCorners2);

    const coeffs = toMatrix(transform1.coeffs);
    const coeffs2 = toMatrix(transform2.coeffs);
    coeffs.multiply(coeffs2.invert());

    if (calibrating) {
      const root: HTMLElement = document.querySelector(".root")!;
      root.style.background = "#000";
      root.style.transformOrigin = "0 0";
      root.style.transform = matrixToCSS(coeffs);
    }
  }

  const transformRef = useContext(MapTransformRef);
  const { currentMap } = useMyProps("currentMap");
  const mapObjectsRef = useServerStateRef(
    (state) => state.maps.entities[currentMap!]!.objects
  );
  const charactersRef = useServerStateRef((state) => state.characters.entities);

  if (!enabled) {
    return null;
  }

  return (
    <>
      {calibrating && <ScreenCornerMarkers />}
      {transform2 &&
        ReactDOM.createPortal(
          Object.entries(pointDict)
            .filter(([id, _]) => parseInt(id) > 7)
            .map(([id, points]) => {
              if (!transform2) {
                return null;
              }

              const screenCoordinates = transform2.transformInverse(
                ...center(points.corners)
              );
              const mapCoordinates = applyToPoint<[number, number]>(
                inverse(transformRef.current),
                screenCoordinates
              );

              let hoveredCharacter: [RRCharacter, RRToken] | null = null;

              for (const object of entries(mapObjectsRef.current)) {
                if (
                  object.type === "token" &&
                  pointDistance(
                    pointAdd(
                      object.position,
                      makePoint(
                        (charactersRef.current[object.characterId]!.scale *
                          GRID_SIZE) /
                          2
                      )
                    ),
                    makePoint(...mapCoordinates)
                  ) < GRID_SIZE
                ) {
                  hoveredCharacter = [
                    charactersRef.current[object.characterId]!,
                    object,
                  ];
                }
              }

              return (
                <Marker
                  key={id}
                  id={parseInt(id)}
                  mapId={currentMap!}
                  active={points.time > cutoffTime}
                  hoveredCharacter={hoveredCharacter}
                  screenCoordinates={screenCoordinates}
                  mapCoordinates={mapCoordinates}
                />
              );
            }),
          document.body
        )}
    </>
  );
}

enum MarkerState {
  GONE,
  UNPAIRED,
  PAIRING,
  PAIRED,
}

function Marker({
  hoveredCharacter,
  screenCoordinates,
  mapCoordinates,
  mapId,
  active,
  id,
}: {
  hoveredCharacter: [RRCharacter, RRToken] | null;
  screenCoordinates: [number, number];
  mapCoordinates: [number, number];
  active: boolean;
  mapId: RRMapID;
  id: number;
}) {
  const hasHovered = !!hoveredCharacter;
  const [lockedCharacter, setLockedCharacter] = useState<
    [RRCharacter, RRToken] | null
  >(null);

  const state = !active
    ? MarkerState.GONE
    : !hasHovered && !lockedCharacter
    ? MarkerState.UNPAIRED
    : hasHovered && !lockedCharacter
    ? MarkerState.PAIRING
    : MarkerState.PAIRED;

  const [firstActive, setFirstActive] = useState<Date | null>(null);

  const MS_TO_PAIR = 1000;

  if (state === MarkerState.PAIRING && firstActive === null) {
    setFirstActive(new Date());
  }
  if (
    state === MarkerState.PAIRING &&
    !!firstActive &&
    +new Date() - +firstActive > MS_TO_PAIR
  ) {
    console.log("Locked", new Date(), firstActive);
    setLockedCharacter(hoveredCharacter);
  }
  if (state === MarkerState.GONE && firstActive !== null) {
    setFirstActive(null);
    setLockedCharacter(null);
  }

  const dispatch = useServerDispatch();

  useEffect(() => {
    if (state === MarkerState.PAIRED) {
      dispatch({
        actions: [
          mapObjectUpdate(mapId, {
            id: lockedCharacter![1].id,
            changes: {
              position: snapPointToGrid(makePoint(...mapCoordinates)),
            },
          }),
        ],
        optimisticKey: "position",
        syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
      });
    }
  });

  const associated =
    state === MarkerState.PAIRED || state === MarkerState.PAIRING;
  const markerSize = associated ? GRID_SIZE * 3 : 30;
  return state === MarkerState.GONE ? null : (
    <div
      style={{
        width: `${markerSize}px`,
        height: `${markerSize}px`,
        borderRadius: "9999px",
        zIndex: 99999999999999,
        background:
          state === MarkerState.PAIRING
            ? "red"
            : state === MarkerState.PAIRED
            ? "transparent"
            : "white",
        border: state === MarkerState.PAIRED ? "10px solid green" : "none",
        left: screenCoordinates[0] - markerSize / 2,
        top: screenCoordinates[1] - markerSize / 2,
        position: "absolute",
      }}
    >
      {id}
      {state === MarkerState.PAIRING && (
        <div
          style={{
            width: `${markerSize}px`,
            height: `${markerSize}px`,
            top: 0,
            left: 0,
            position: "absolute",
            borderRadius: "9999px",
            background: "#0f0",
            animation: `reveal-circle ${MS_TO_PAIR}ms linear both`,
          }}
        ></div>
      )}
    </div>
  );
}

const ScreenCornerMarkers = React.memo(function ScreenCornerMarkers() {
  const common = {
    position: "absolute",
    zIndex: 99999,
    width: "100px",
    height: "100px",
    border: "0px solid white",
  } as const;

  return ReactDOM.createPortal(
    <>
      <img src={marker1} style={{ ...common, top: 0, left: 0 }} />
      <img src={marker2} style={{ ...common, top: 0, right: 0 }} />
      <img src={marker3} style={{ ...common, bottom: 0, left: 0 }} />
      <img src={marker4} style={{ ...common, bottom: 0, right: 0 }} />
    </>,
    document.body
  );
});
