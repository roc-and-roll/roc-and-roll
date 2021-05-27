/* eslint-disable react-hooks/rules-of-hooks */
// Based on the code from a PR by @Svish to react-use
// https://github.com/streamich/react-use/pull/1438
// Licensed under the Unlicense.
import { useState, useCallback, Dispatch, SetStateAction } from "react";
import { JsonValue } from "type-fest";
import { isBrowser, noop } from "./util";

const deserializer = JSON.parse;

const serializer = JSON.stringify;

export default function useLocalState(
  key: string,
  initialValue: number
): [number, Dispatch<SetStateAction<number>>, () => void];

export default function useLocalState(
  key: string,
  initialValue: boolean
): [boolean, Dispatch<SetStateAction<boolean>>, () => void];

export default function useLocalState(
  key: string,
  initialValue: string
): [string, Dispatch<SetStateAction<string>>, () => void];

export default function useLocalState<T extends JsonValue>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>, () => void];

export default function useLocalState<T extends JsonValue>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>, () => void] {
  if (!isBrowser) {
    return [initialValue, noop, noop];
  }
  if (!key) {
    throw new Error("useLocalStorage key may not be falsy");
  }

  const [state, setState] = useState<T>(() => {
    try {
      const localStorageValue = localStorage.getItem(key);
      if (localStorageValue !== null) {
        return deserializer(localStorageValue) as T;
      } else {
        localStorage.setItem(key, serializer(initialValue));
        return initialValue;
      }
    } catch {
      // If user is in private mode or has storage restriction
      // localStorage can throw. JSON.parse and JSON.stringify
      // can throw, too.
      return initialValue;
    }
  });

  const set: Dispatch<SetStateAction<T>> = useCallback(
    (valOrFunc) => {
      setState((prevState) => {
        const newState =
          typeof valOrFunc === "function"
            ? (valOrFunc as (prevState: T) => T)(prevState)
            : valOrFunc;

        try {
          localStorage.setItem(key, serializer(newState));
          return newState;
        } catch {
          // If user is in private mode or has storage restriction
          // localStorage can throw. Also JSON.stringify can throw.
          return prevState;
        }
      });
    },
    [key]
  );

  const remove = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setState(initialValue);
    } catch {
      // If user is in private mode or has storage restriction
      // localStorage can throw.
    }
  }, [initialValue, key]);

  return [state, set, remove];
}
