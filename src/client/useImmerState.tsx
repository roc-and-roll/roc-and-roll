import produce from "immer";
import type { Draft } from "immer/dist/types/types-external";
import { useState, useCallback } from "react";

export function useImmerState<V>(initialValue: V | (() => V)) {
  const [get, set] = useState<V>(initialValue);
  const immerSet = useCallback(
    (valueOrUpdater: V | ((draft: Draft<V>) => V | void)) => {
      if (typeof valueOrUpdater === "function") {
        set(produce<V>(valueOrUpdater as (draft: Draft<V>) => V | void));
      } else {
        set(valueOrUpdater);
      }
    },
    []
  );
  return [get, immerSet] as const;
}
