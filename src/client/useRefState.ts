import React, { useCallback, useRef, useState } from "react";

export function useRefState<S>(initialValue: S) {
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
