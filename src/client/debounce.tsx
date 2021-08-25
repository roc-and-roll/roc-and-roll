import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useLatest } from "./useLatest";
import { useGuranteedMemo } from "./useGuranteedMemo";

type PendingChangeSubscriber = (pending: boolean) => void;

class DebouncerImpl<A extends unknown[], R extends unknown> {
  private lastArgs: null | A = null;
  private pendingChangeSubscribers = new Set<PendingChangeSubscriber>();

  constructor(
    private readonly debouncee: (...args: A) => R,
    private readonly schedule: (debouncer: DebouncerImpl<A, R>) => void,
    private readonly unschedule: (debouncer: DebouncerImpl<A, R>) => void
  ) {}

  public debounced = (...args: A): void => {
    this.lastArgs = args;
    this.pendingChangeSubscribers.forEach((subscriber) => subscriber(true));

    this.schedule(this);
  };

  public active = () => this.lastArgs !== null;

  public dispose = (executePending: boolean) => {
    this.unschedule(this);
    if (executePending) {
      this.executePending();
    }
  };

  public executePending = () => {
    if (this.lastArgs !== null) {
      this.pendingChangeSubscribers.forEach((subscriber) => subscriber(false));
      this.unschedule(this);
      const args = this.lastArgs;
      this.lastArgs = null;
      this.debouncee(...args);
    }
  };

  public onPendingChanges = (subscriber: PendingChangeSubscriber) => {
    this.pendingChangeSubscribers.add(subscriber);

    return () => this.pendingChangeSubscribers.delete(subscriber);
  };
}

export class SyncedDebouncer {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly pendingDebouncers: Set<DebouncerImpl<any, any>> = new Set();

  constructor(private readonly time: number) {}

  public makeDebouncer<A extends unknown[], R extends unknown>(
    debouncee: (...args: A) => R
  ) {
    const schedule = (debouncer: DebouncerImpl<A, R>) => {
      if (this.pendingDebouncers.has(debouncer)) {
        return;
      }
      this.pendingDebouncers.add(debouncer);

      this.timeoutId ??= setTimeout(() => {
        const debouncers = Array.from(this.pendingDebouncers);
        this.pendingDebouncers.clear();
        this.timeoutId = null;
        for (const debouncer of debouncers) {
          debouncer.executePending();
        }
      }, this.time);
    };

    const unschedule = (debouncer: DebouncerImpl<A, R>) => {
      this.pendingDebouncers.delete(debouncer);
      if (this.pendingDebouncers.size === 0 && this.timeoutId !== null) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
    };

    const debouncer = new DebouncerImpl(debouncee, schedule, unschedule);

    return {
      debounced: debouncer.debounced,
      active: debouncer.active,
      executePending: debouncer.executePending,
      dispose: debouncer.dispose,
      onPendingChanges: debouncer.onPendingChanges,
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
): [
  debounce: (...args: A) => void,
  isDebouncing: () => boolean,
  executePending: () => void,
  onPendingChanges: (s: (p: boolean) => void) => () => void
] {
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

  return [
    debouncer.debounced,
    debouncer.active,
    debouncer.executePending,
    debouncer.onPendingChanges,
  ];
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

  const [serverCallback] = useDebounce(
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

  return useDebounce(firstDebounce, localDebounceTime, forceOnUnmount)[0];
}

export function useIsolatedValue<V>({
  value: externalValue,
  onChange: setExternalValue,
  takeValueDefault,
  reportChangesDefault,
}: {
  value: V;
  onChange: (v: V) => void;
  takeValueDefault?: boolean;
  reportChangesDefault?: boolean;
}): [
  V,
  (v: V) => void,
  {
    takeValueRef: React.MutableRefObject<boolean>;
    reportChangesRef: React.MutableRefObject<boolean>;
  }
] {
  const takeValueRef = useRef(takeValueDefault ?? true);
  const reportChangesRef = useRef(reportChangesDefault ?? true);

  const [internalValue, setInternalValue] = useState(externalValue);

  const internalValueChangedRef = useRef(false);

  useEffect(() => {
    if (takeValueRef.current) {
      setInternalValue(externalValue);
    }
  }, [externalValue]);

  useEffect(() => {
    if (reportChangesRef.current && internalValueChangedRef.current) {
      setExternalValue(internalValue);
      internalValueChangedRef.current = false;
    }
  }, [internalValue, setExternalValue]);

  return [
    internalValue,
    useCallback((value: V) => {
      internalValueChangedRef.current = true;
      setInternalValue(value);
    }, []),
    { takeValueRef, reportChangesRef },
  ];
}

function useDebouncedOrTransition<V>(
  onChange: (v: V) => void,
  debounce: number
) {
  const onChangeRef = useLatest(onChange);

  const [isPending, setIsPending] = useState(false);

  const [propagateValueToOutside, _, executePending, onPendingChanges] =
    useDebounce(
      useCallback((value: V) => onChangeRef.current(value), [onChangeRef]),
      debounce,
      true
    );

  useEffect(() => {
    const unsubscribe = onPendingChanges((pending) => setIsPending(pending));

    return () => unsubscribe();
  });

  return [propagateValueToOutside, executePending, isPending] as const;

  // FIXME: This code is not working correctly. When throttling the CPU 6x,
  //        it fails to report the latest value to the server when repeatedly
  //        making changes.
  //
  // const [isPending, startTransition] = useTransition();
  // const valueRef = useRef<null | { value: V }>(null);

  // return [
  //   useCallback(
  //     (value: V) => {
  //       valueRef.current = { value };
  //       startTransition(() => {
  //         console.log("t", value);
  //         onChangeRef.current(value);
  //       });
  //     },
  //     [onChangeRef, startTransition]
  //   ),
  //   useCallback(() => {
  //     if (valueRef.current !== null) {
  //       const value = valueRef.current.value;
  //       valueRef.current = null;
  //       console.log("s", value);
  //       onChangeRef.current(value);
  //     }
  //   }, [onChangeRef]),
  //   isPending,
  // ] as const;
}

export function useDebouncedField<V, E extends HTMLElement>({
  debounce,
  value: externalValue,
  onChange: externalOnChange,
  onKeyPress,
  onFocus,
  onBlur,
  ...props
}: { debounce: number; value: V; onChange: (v: V) => void } & Omit<
  React.HTMLAttributes<E>,
  "value" | "onChange"
>) {
  const [value, setValue, { takeValueRef }] = useIsolatedValue({
    value: externalValue,
    onChange: externalOnChange,
    // Never report changes to the outside. Instead, we call externalOnChange
    // manually as part of a debounced callback.
    reportChangesDefault: false,
  });

  const ref = useRef<E>(null);

  const [propagateValueToOutside, executePending, isDebouncePending] =
    useDebouncedOrTransition(externalOnChange, debounce);

  const [isTransitionPending, startTransition] = useTransition();

  return [
    {
      value,
      onChange: useCallback(
        (value: V) => {
          setValue(value);
          propagateValueToOutside(value);
          // Immediately propagate the change to the outside as part of a
          // transition.
          // TODO: I'm not 100% certain that this does what we want it to.
          startTransition(() => executePending());

          // No idea if this would even make sense:
          // ReactDOM.unstable_scheduleHydration(ref.current);
        },
        [
          setValue,
          propagateValueToOutside,
          executePending,
          startTransition,
          /* ref, */
        ]
      ),
      onKeyPress: useCallback(
        (e: React.KeyboardEvent<E>) => {
          if (e.key === "Enter") {
            executePending();
          }
          onKeyPress?.(e);
        },
        [onKeyPress, executePending]
      ),
      onFocus: useCallback(
        (e: React.FocusEvent<E>) => {
          takeValueRef.current = false;
          onFocus?.(e);
        },
        [onFocus, takeValueRef]
      ),
      onBlur: useCallback(
        (e: React.FocusEvent<E>) => {
          takeValueRef.current = true;
          executePending();
          onBlur?.(e);
        },
        [onBlur, takeValueRef, executePending]
      ),
      ...props,
    },
    ref,
    isDebouncePending || isTransitionPending,
  ] as const;
}
