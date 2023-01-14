import { useContext, useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { DebugSettingsContext } from "../hud/DebugSettings";

type Corner = [number, number];
type Corners = [Corner, Corner, Corner, Corner];

function center(points: Corners) {
  const x_center =
    points.reduce((acc, point) => acc + point[0], 0) / points.length;
  const y_center =
    points.reduce((acc, point) => acc + point[1], 0) / points.length;
  return [x_center, y_center];
}

export function ARMode() {
  const [settings, setSettings] = useContext(DebugSettingsContext);
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEnabled(params.get("ar") !== null);
  }, []);

  useEffect(() => {
    setSettings((settings) => ({
      ...settings,
      noHUD: enabled,
    }));
  }, [enabled, setSettings]);

  const pointDict = useRef<Record<number, Corners>>({});
  const msgCounter = useRef(0);

  useEffect(() => {
    if (enabled) {
      pointDict.current = {};
      msgCounter.current = 0;

      const socket = io("192.168.0.238:3377");
      socket.on(
        "points",
        (
          markers: Array<{
            id: number;
            points: Corners;
          }>
        ) => {
          msgCounter.current++;
          markers.forEach((marker) => {
            pointDict.current[marker.id] = marker.points;
          });
        }
      );

      return () => {
        socket.disconnect();
      };
    }
  }, [enabled]);

  const isCalibrated = useRef(false);

  useEffect(() => {
    if (enabled) {
      const id = setInterval(() => {
        console.log(pointDict.current);

        if (
          //  !isCalibrated.current &&
          pointDict.current[1] &&
          pointDict.current[2] &&
          pointDict.current[3] &&
          pointDict.current[4]
        ) {
          isCalibrated.current = true;
          const dstCorners = [0, 0, 1920, 0, 0, 1080, 1920, 1080];
          const srcCorners = [
            center(pointDict.current[1]),
            center(pointDict.current[2]),
            center(pointDict.current[3]),
            center(pointDict.current[4]),
          ].flat();
          console.log({ srcCorners, dstCorners });
          const perspT = require("perspective-transform")(
            dstCorners,
            srcCorners
          );
          const coeffs = perspT.coeffsInv;
          console.log(perspT);

          console.log(
            Math.max(srcCorners[0], srcCorners[2], srcCorners[4], srcCorners[6])
          );
          console.log(
            Math.max(srcCorners[1], srcCorners[3], srcCorners[5], srcCorners[7])
          );

          document.body.style.transform = `matrix3d(${coeffs[0]}, ${coeffs[3]}, 0, ${coeffs[6]},
  ${coeffs[1]}, ${coeffs[4]}, 0, ${coeffs[7]},
  0, 0, 1, 0, 
  ${coeffs[2]}, ${coeffs[5]}, 0, ${coeffs[8]}
  )`;
        }
      }, 250);

      return () => {
        clearInterval(id);
      };
    }
  }, [enabled]);

  return null;
}
