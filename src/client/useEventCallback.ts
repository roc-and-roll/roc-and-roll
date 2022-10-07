import { useCallback } from "react";
import { useLatest } from "./useLatest";

// Based on https://github.com/facebook/react/issues/14099#issuecomment-440013892
// This is an alternative to the useCallback + useLatest hack, with similar
// drawbacks.
export function useEventCallback<T extends (...args: unknown[]) => unknown>(
  fn: T
) {
  const fnRef = useLatest(fn);
  return useCallback(() => (void 0, fnRef.current)(), []);
}
