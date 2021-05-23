import tinycolor from "tinycolor2";
import { RRTimestamp } from "../shared/state";

export function apiHost() {
  let port = window.location.port;
  // Normally, the port corresponds to the current port.
  // However, ports are different in development -> force port 3000.
  if (process.env.NODE_ENV === "development") {
    port = "3000";
  }
  return `${window.location.protocol}//${window.location.hostname}:${port}`;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const noop = () => {};

export const isBrowser = typeof window !== "undefined";

export function formatTimestamp(timestamp: RRTimestamp) {
  return new Date(timestamp).toLocaleString();
}

export function partition<E, A extends E = E, B extends E = E>(
  arr: E[],
  fn: (each: E) => boolean
) {
  const a = [] as A[];
  const b = [] as B[];

  arr.forEach((each) => {
    if (fn(each)) {
      a.push(each as A);
    } else {
      b.push(each as B);
    }
  });

  return [a, b] as const;
}

export const contrastColor = (color: string) =>
  tinycolor.mostReadable(color, ["#000", "#fff"]).toRgbString();
