import { nanoid } from "@reduxjs/toolkit";
import { RRID, RRTimestamp } from "./state";

export function isObject(item: any): item is Record<string, any> {
  return item && typeof item === "object" && !Array.isArray(item);
}

export function mergeDeep<T>(base: any, patch: any): T {
  if (!isObject(base)) {
    return patch;
  }
  const output = { ...base };
  if (isObject(patch)) {
    Object.keys(patch).forEach((key) => {
      if (isObject(patch[key])) {
        if (!(key in base)) {
          Object.assign(output, { [key]: patch[key] });
        } else {
          output[key] = mergeDeep(base[key], patch[key]);
        }
      } else {
        Object.assign(output, {
          [key]: patch[key],
        });
      }
    });
  }
  return output as T;
}

export function rrid<E extends { id: RRID }>() {
  return nanoid() as E["id"];
}

export function timestamp(): RRTimestamp {
  return Date.now() as RRTimestamp;
}

export function debounced<A extends unknown[], R extends unknown>(
  fn: (...args: A) => R,
  time: number
): (...args: A) => void {
  const nextArgs: { current: A | null } = { current: null };
  const timerId: { current: ReturnType<typeof setTimeout> | null } = {
    current: null,
  };

  return (...args: A) => {
    nextArgs.current = args;
    timerId.current ??= setTimeout(() => {
      const args = nextArgs.current!;
      timerId.current = null;
      nextArgs.current = null;
      fn(...args);
    }, time);
  };
}

export function assertNever(val: never): never {
  throw new Error();
}
