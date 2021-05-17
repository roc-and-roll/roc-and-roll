import React, { useCallback, useRef, useState } from "react";
import { Primitive } from "type-fest";

const UNINITIALIZED = {};

export function useStateWithRef<
  // S is allowed to be basically everything, except for functions. Feel free
  // to extend V further.
  S extends Primitive | Record<string | number, unknown> | Array<unknown>
>(initialValue: S | (() => S)) {
  const [state, _setState] = useState(initialValue);
  const stateRef_ = useRef<S | typeof UNINITIALIZED>(UNINITIALIZED);
  if (stateRef_.current === UNINITIALIZED) {
    stateRef_.current =
      typeof initialValue === "function" ? initialValue() : initialValue;
  }
  const stateRef = stateRef_ as React.MutableRefObject<S>;

  const setState = useCallback(
    (updater: React.SetStateAction<S>) => {
      let result: S;
      if (typeof updater === "function") {
        result = updater(stateRef.current);
      } else {
        result = updater;
      }
      stateRef.current = result;
      _setState(result);
    },
    [stateRef]
  );

  return [state, stateRef, setState] as const;
}

export function useStateWithExistingRef<S>(
  stateRef: React.MutableRefObject<S>
) {
  const [state, _setState] = useState(stateRef.current);

  const setState = useCallback(
    (updater: React.SetStateAction<S>) => {
      let result: S;
      if (typeof updater === "function") {
        result = (updater as (s: S) => S)(stateRef.current);
      } else {
        result = updater;
      }
      stateRef.current = result;
      _setState(result);
    },
    [stateRef]
  );

  return [state, setState] as const;
}
