import { useRef } from "react";

export function useGuranteedMemo<R extends unknown, D extends unknown[]>(
  fn: () => R,
  deps: D
) {
  const resultRef = useRef<R | null>(null);
  const prevDeps = useRef<D | null>(null);

  if (
    prevDeps.current !== null &&
    (prevDeps.current.length !== deps.length ||
      prevDeps.current.some((prevDep, i) => !Object.is(prevDep, deps[i])))
  ) {
    resultRef.current = null;
  }

  prevDeps.current = deps;

  return (resultRef.current ??= fn());
}
