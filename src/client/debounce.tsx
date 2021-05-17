import { nanoid } from "@reduxjs/toolkit";
import { useCallback, useEffect, useRef } from "react";
import { useLatest } from "./state";
import { useGuranteedMemo } from "./useGuranteedMemo";

export class SyncedDebouncer {
  private readonly fns = new Map<
    string,
    { lastArgs: unknown[] | null; debouncee: (...args: unknown[]) => unknown }
  >();
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly time: number) {}

  public makeDebouncer<A extends unknown[], R extends unknown>(
    debouncee: (...args: A) => R
  ) {
    const id = nanoid();

    this.fns.set(id, {
      lastArgs: null,
      debouncee: debouncee as any,
    });

    return {
      debounced: (...args: A) => {
        const data = this.fns.get(id);
        if (!data) {
          return;
        }

        data.lastArgs = args;

        this.timeoutId ??= setTimeout(() => {
          this.timeoutId = null;
          for (const data of this.fns.values()) {
            if (data.lastArgs !== null) {
              const args = data.lastArgs;
              data.lastArgs = null;
              data.debouncee(...args);
            }
          }
        }, this.time);
      },
      dispose: (executePending: boolean) => {
        const fn = this.fns.get(id);
        if (fn) {
          this.fns.delete(id);
          if (this.fns.size === 0 && this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
          }
          if (executePending && fn.lastArgs) {
            fn.debouncee(...fn.lastArgs);
          }
        } else {
          throw new Error("Already disposed!");
        }
      },
    };
  }

  public getTime() {
    return this.time;
  }
}

export type Debouncer = number | SyncedDebouncer;

export function debouncerTime(debounce: Debouncer) {
  return typeof debounce === "number" ? debounce : debounce.getTime();
}

function ensureSyncedDebouncer(debounce: Debouncer) {
  return typeof debounce === "number"
    ? new SyncedDebouncer(debounce)
    : debounce;
}

/**
 * Returns a new function that, when called, will debounce calls to the passed
 * callback function by debounceTime ms.
 */
export function useDebounce<A extends unknown[]>(
  callback: (...args: A) => unknown,
  debounce: Debouncer,
  forceOnUnmount: boolean = false
): (...args: A) => void {
  const forceOnUnmountRef = useLatest(forceOnUnmount);

  const syncedDebouncer = useGuranteedMemo(
    () => ensureSyncedDebouncer(debounce),
    [debounce]
  );

  const debouncer = useGuranteedMemo(
    () => syncedDebouncer.makeDebouncer<A, unknown>(callback),
    [callback, syncedDebouncer]
  );

  useEffect(() => {
    const forceOnUnmount = forceOnUnmountRef.current;
    return () => {
      debouncer.dispose(forceOnUnmount);
    };
  }, [debouncer, forceOnUnmountRef]);

  return debouncer.debounced;
}

/**
 * Returns a new function that, when called, will debounce calls to the passed
 * callback function by debounceTime ms. However, the passed callback will be
 * called with an array of all arguments of all invocations that happened while
 * the debounce was in progress.
 */
export function useAggregatedDebounce<A extends unknown[]>(
  callback: (args: A[]) => unknown,
  debounce: Debouncer,
  forceOnUnmount: boolean = false
): (...args: A) => void {
  const argHistory = useRef<A[]>([]);

  const callbackRef = useLatest(callback);

  const serverCallback = useDebounce(
    useCallback(() => {
      const args = argHistory.current;
      argHistory.current = [];
      callbackRef.current(args);
    }, [callbackRef]),
    debounce,
    forceOnUnmount
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
  serverDebounce: Debouncer,
  localDebounceSteps: number,
  forceOnUnmount: boolean = false
): (...args: A) => void {
  const localDebounceTime = debouncerTime(serverDebounce) / localDebounceSteps;
  if (
    process.env.NODE_ENV !== "production" &&
    (isNaN(localDebounceTime) || !isFinite(localDebounceTime))
  ) {
    throw new Error(`localDebounceTime must be a number and finite.`);
  }

  const firstDebounce = useAggregatedDebounce(
    callback,
    serverDebounce,
    forceOnUnmount
  );

  return useDebounce(firstDebounce, localDebounceTime, forceOnUnmount);
}
