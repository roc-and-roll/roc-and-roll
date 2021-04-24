import { useCallback, useEffect, useRef } from "react";

/**
 * Returns a new function that, when called, will debounce calls to the passed
 * callback function by debounceTime ms.
 */
export function useDebounce<A extends unknown[], R extends unknown>(
  callback: (...args: A) => R,
  debounceTime: number
): (...args: A) => void {
  const lastArgs = useRef<A | null>(null);
  const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
    };
  }, []);

  return useCallback(
    (...args: A): void => {
      lastArgs.current = args;
      timeoutId.current ??= setTimeout(() => {
        const args = lastArgs.current!;
        timeoutId.current = null;
        lastArgs.current = null;
        callback(...args);
      }, debounceTime);
    },
    [callback, debounceTime]
  );
}

/**
 * Returns a new function that, when called, will debounce calls to the passed
 * callback function by debounceTime ms. However, the passed callback will be
 * called with an array of all arguments of all invocations that happened while
 * the debounce was in progress.
 */
export function useAggregatedDebounce<A extends unknown[], R extends unknown>(
  callback: (args: A[]) => R,
  debounceTime: number
): (...args: A) => void {
  const argHistory = useRef<A[]>([]);

  const serverCallback = useDebounce(
    useCallback(() => {
      const args = argHistory.current;
      argHistory.current = [];
      callback(args);
    }, [callback]),
    debounceTime
  );

  const localCallback = useCallback(
    (...args: A) => {
      argHistory.current.push(args);
      serverCallback();
    },
    [serverCallback]
  );

  return localCallback;
}

export function useAggregatedDoubleDebounce<
  A extends unknown[],
  R extends unknown
>(
  callback: (args: A[]) => R,
  serverDebounceTime: number,
  localDebounceSteps: number
): (...args: A) => void {
  const localDebounceTime = serverDebounceTime / localDebounceSteps;

  const firstDebounce = useAggregatedDebounce(callback, serverDebounceTime);

  return useDebounce(firstDebounce, localDebounceTime);
}
