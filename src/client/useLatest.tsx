import { useLayoutEffect, useRef } from "react";

export function useLatest<V>(value: V) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
