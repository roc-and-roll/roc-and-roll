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
  initialValue: number,
  storage?: Storage
): [number, Dispatch<SetStateAction<number>>, () => void];

export default function useLocalState(
  key: string,
  initialValue: boolean,
  storage?: Storage
): [boolean, Dispatch<SetStateAction<boolean>>, () => void];

export default function useLocalState(
  key: string,
  initialValue: string,
  storage?: Storage
): [string, Dispatch<SetStateAction<string>>, () => void];

export default function useLocalState<T extends JsonValue>(
  key: string,
  initialValue: T,
  storage?: Storage
): [T, Dispatch<SetStateAction<T>>, () => void];

export default function useLocalState<T extends JsonValue>(
  key: string,
  initialValue: T,
  storage: Storage = localStorage
): [T, Dispatch<SetStateAction<T>>, () => void] {
  if (!isBrowser) {
    return [initialValue, noop, noop];
  }
  if (!key) {
    throw new Error("useLocalStorage key may not be falsy");
  }

  const [state, setState] = useState<T>(() => {
    try {
      const localStorageValue = storage.getItem(key);
      if (localStorageValue !== null) {
        return deserializer(localStorageValue) as T;
      } else {
        storage.setItem(key, serializer(initialValue));
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
          typeof valOrFunc === "function" ? valOrFunc(prevState) : valOrFunc;

        try {
          storage.setItem(key, serializer(newState));
          return newState;
        } catch {
          // If user is in private mode or has storage restriction
          // localStorage can throw. Also JSON.stringify can throw.
          return prevState;
        }
      });
    },
    [key, storage]
  );

  const remove = useCallback(() => {
    try {
      storage.removeItem(key);
      setState(initialValue);
    } catch {
      // If user is in private mode or has storage restriction
      // localStorage can throw.
    }
  }, [initialValue, key, storage]);

  return [state, set, remove];
}
