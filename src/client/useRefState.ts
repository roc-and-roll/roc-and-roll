import React, { useCallback, useRef, useState } from "react";

export function useStateWithRef<S>(initialValue: S) {
  const [state, _setState] = useState(initialValue);
  const stateRef = useRef(initialValue);

  const setState = useCallback((updater: React.SetStateAction<S>) => {
    let result: S;
    if (typeof updater === "function") {
      result = (updater as (s: S) => S)(stateRef.current);
    } else {
      result = updater;
    }
    stateRef.current = result;
    _setState(result);
  }, []);

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
