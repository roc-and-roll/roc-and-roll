import { nanoid } from "@reduxjs/toolkit";
import { TOKEN_SIZES } from "./constants";
import { RRCharacter, RRID, RRTimestamp } from "./state";

export async function randomName(pattern = "!<s|B|Bv|v><V|s|'|V><s|V|C>") {
  return new (await import("./namegen")).default(pattern).toString();
}

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
        Object.assign(output, { [key]: patch[key] });
      }
    });
  }
  return output as T;
}

export function rrid<E extends { id: RRID }>() {
  return nanoid() as E["id"];
}

export function timestamp(): RRTimestamp {
  return Date.now();
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

export function clamp(min: number, val: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export function withDo<V, R>(value: V, block: (v: V) => R) {
  return block(value);
}

//
// For debugging only
//

// eslint-disable-next-line @typescript-eslint/ban-types
const hashes = new WeakMap<object, number>();
let nextHash = 1;

// eslint-disable-next-line @typescript-eslint/ban-types
export function identityHash(object: object): number {
  if (hashes.has(object)) {
    return hashes.get(object)!;
  }
  hashes.set(object, nextHash++);

  return identityHash(object);
}

export function fittingTokenSize(requestedSize: number): number {
  return (
    TOKEN_SIZES.find((possibleSize) => possibleSize >= requestedSize) ??
    TOKEN_SIZES[TOKEN_SIZES.length - 1]!
  );
}

export function isCharacterHurt(character: RRCharacter) {
  return character.maxHP > 0 && character.hp <= character.maxHP / 2;
}

export const EMPTY_ARRAY = [];
