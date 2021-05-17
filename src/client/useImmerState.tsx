import produce from "immer";
import type { Draft } from "immer/dist/types/types-external";
import { useState, useCallback } from "react";
import { Primitive } from "type-fest";

export function useImmerState<
  // V is allowed to be basically everything, except for functions. Feel free
  // to extend V further.
  V extends Primitive | Record<string | number, unknown> | Array<unknown>
>(initialValue: V | (() => V)) {
  const [state, setState] = useState(initialValue);
  const setImmerState = useCallback(
    (valueOrUpdater: V | ((draft: Draft<V>) => V | void)) => {
      if (typeof valueOrUpdater === "function") {
        setState(produce<V>(valueOrUpdater));
      } else {
        setState(valueOrUpdater);
      }
    },
    []
  );
  return [state, setImmerState] as const;
}
