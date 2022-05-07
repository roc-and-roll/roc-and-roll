import { useCallback } from "react";
import { useLatest } from "./useLatest";

// Based on https://github.com/facebook/react/issues/14099#issuecomment-440013892
// This is an alternative to the useCallback + useLatest hack, with similar
// drawbacks.
//
// It looks like this might become part of React (without the drawbacks), see
// https://github.com/reactjs/rfcs/blob/useevent/text/0000-useevent.md.
export function useEvent<A extends any[], R>(
  fn: (...args: A) => R
): (...args: A) => R {
  const fnRef = useLatest(fn);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((...args: A): R => fnRef.current(...args), []);
}
