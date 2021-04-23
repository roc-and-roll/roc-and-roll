import { useCallback, useEffect, useRef } from "react";

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
