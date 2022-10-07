// cspell: disable-next-line
/* eslint-disable @grncdr/react-hooks/rules-of-hooks */
//
// Based on the code from a PR by @Svish to react-use
// https://github.com/streamich/react-use/pull/1438
// Licensed under the Unlicense.
import { useState, useCallback, Dispatch, SetStateAction } from "react";
import {
  Jsonify, //cspell: disable-line
  JsonValue,
} from "type-fest";
import { useLatest } from "./useLatest";
import { isBrowser, noop } from "./util";
import sjson from "secure-json-parse";

const deserializer = sjson.parse;

const serializer = JSON.stringify;

function getInitialValue<T extends JsonValue>(initializer: T | (() => T)): T {
  return typeof initializer === "function" ? initializer() : initializer;
}

export default function useLocalState(
  key: string,
  initializer: number | (() => number),
  storage?: Storage
): [number, Dispatch<SetStateAction<number>>, () => void];

export default function useLocalState(
  key: string,
  initializer: boolean | (() => boolean),
  storage?: Storage
): [boolean, Dispatch<SetStateAction<boolean>>, () => void];

export default function useLocalState(
  key: string,
  initializer: string | (() => string),
  storage?: Storage
): [string, Dispatch<SetStateAction<string>>, () => void];

export default function useLocalState<T>(
  key: string,
  initializer: Jsonify<T> | (() => Jsonify<T>), //cspell: disable-line
  storage?: Storage
): [T, Dispatch<SetStateAction<T>>, () => void];

export default function useLocalState<T>(
  key: string,
  initializer: T | (() => T),
  storage: Storage = localStorage
): [T, Dispatch<SetStateAction<T>>, () => void] {
  if (!isBrowser) {
    return [getInitialValue(initializer), noop, noop];
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
        const initialValue = getInitialValue(initializer);
        storage.setItem(key, serializer(initialValue));
        return initialValue;
      }
    } catch {
      // If the user is in private mode or has storage restriction
      // localStorage can throw. JSON.parse and JSON.stringify
      // can throw, too.
      return getInitialValue(initializer);
    }
  });

  const set = useCallback(
    (valOrFunc: SetStateAction<T>) => {
      setState((prevState) => {
        const newState =
          typeof valOrFunc === "function"
            ? (valOrFunc as (prevState: T) => T)(prevState)
            : valOrFunc;

        try {
          storage.setItem(key, serializer(newState));
          return newState;
        } catch {
          // If the user is in private mode or has storage restriction
          // localStorage can throw. Also JSON.stringify can throw.
          return prevState;
        }
      });
    },
    [key, storage]
  );

  const initializerRef = useLatest(initializer);

  const remove = useCallback(() => {
    try {
      storage.removeItem(key);
      setState(getInitialValue(initializerRef.current));
    } catch {
      // If the user is in private mode or has storage restriction
      // localStorage can throw.
    }
  }, [key, storage]);

  return [state, set, remove];
}
