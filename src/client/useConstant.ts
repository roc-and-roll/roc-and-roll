import { useRef } from "react";

const SENTINEL = {};

// Returns a constant value that is guaranteed to never change during the
// lifetime of the component.
export function useConstant<V>(initializer: () => V): V {
  const ref = useRef(SENTINEL);
  if (ref === SENTINEL) {
    ref.current = initializer();
  }

  return ref.current as V;
}
