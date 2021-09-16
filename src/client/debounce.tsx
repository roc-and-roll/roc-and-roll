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

  public debouncedCallback = (...args: A): void => {
    this.lastArgs = args;
    this.pendingChangeSubscribers.forEach((subscriber) => subscriber(true));

    this.schedule(this);
  };

  public hasPendingCall = () => this.lastArgs !== null;

  public dispose = (executePending: boolean) => {
    this.unschedule(this);
    if (executePending) {
      this.forceExecutePendingCall();
    }
  };

  public forceExecutePendingCall = () => {
    if (this.lastArgs !== null) {
      this.pendingChangeSubscribers.forEach((subscriber) => subscriber(false));
      this.unschedule(this);
      const args = this.lastArgs;
      this.lastArgs = null;
      this.debouncee(...args);
    }
  };

  public subscribeToPendingStateUpdates = (
    subscriber: PendingChangeSubscriber
  ) => {
    this.pendingChangeSubscribers.add(subscriber);

    return () => this.pendingChangeSubscribers.delete(subscriber);
  };
}

export class SyncedDebounceMaker {
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
          debouncer.forceExecutePendingCall();
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

    return new DebouncerImpl(debouncee, schedule, unschedule);
  }

  public getTime() {
    return this.time;
  }
}

export type Debouncer = number | SyncedDebounceMaker;

export function debouncerTime(debounce: Debouncer) {
  return typeof debounce === "number" ? debounce : debounce.getTime();
}

function ensureSyncedDebounceMaker(debounce: Debouncer) {
  return typeof debounce === "number"
    ? new SyncedDebounceMaker(debounce)
    : debounce;
}

/**
 * Returns a new function that, when called, will debounce calls to the passed
 * callback function by using the provided debounce implementation.
 */
export function useDebounce<A extends unknown[]>(
  callback: (...args: A) => unknown,
  debounce: Debouncer,
  forceOnUnmount: boolean
): [
  debounce: (...args: A) => void,
  isDebouncing: () => boolean,
  executePending: () => void,
  onPendingChanges: (s: (p: boolean) => void) => () => void
] {
  const forceOnUnmountRef = useLatest(forceOnUnmount);

  const syncedDebounceMaker = useGuranteedMemo(
    () => ensureSyncedDebounceMaker(debounce),
    [debounce]
  );

  const debouncer = useGuranteedMemo(
    () => syncedDebounceMaker.makeDebouncer<A, unknown>(callback),
    [callback, syncedDebounceMaker]
  );

  useEffect(() => {
    const forceOnUnmount = forceOnUnmountRef.current;
    return () => {
      debouncer.dispose(forceOnUnmount);
    };
  }, [debouncer, forceOnUnmountRef]);

  return [
    debouncer.debouncedCallback,
    debouncer.hasPendingCall,
    debouncer.forceExecutePendingCall,
    debouncer.subscribeToPendingStateUpdates,
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
  forceOnUnmount: boolean
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
  forceOnUnmount: boolean
): (...args: A) => void {
  const localDebounceTime = debouncerTime(serverDebounce) / localDebounceSteps;
  if (isNaN(localDebounceTime) || !isFinite(localDebounceTime)) {
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

  useEffect(() => {
    if (takeValueRef.current) {
      setInternalValue(externalValue);
    }
  }, [externalValue]);

  const setExternalValueRef = useLatest(setExternalValue);

  return [
    internalValue,
    useCallback(
      (value: V) => {
        setInternalValue(value);
        if (reportChangesRef.current) {
          setExternalValueRef.current(value);
        }
      },
      [setExternalValueRef]
    ),
    { takeValueRef, reportChangesRef },
  ];
}

export function useFieldWithSmartOnChangeTransitions<V, E extends HTMLElement>({
  debounce: debounceTime,
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
  const externalOnChangeRef = useLatest(externalOnChange);
  const debounceTimeRef = useLatest(debounceTime);

  const [value, setValue, { takeValueRef }] = useIsolatedValue({
    value: externalValue,
    onChange: externalOnChange,
    // Never report changes to the outside. Instead, we call externalOnChange
    // manually as part of a debounced callback.
    reportChangesDefault: false,
  });

  const ref = useRef<E>(null);

  const [isTransitionPending, startTransition] = useTransition();

  const changedValueRef = useRef<{
    value: V;
    dirtyTimeoutId: ReturnType<typeof setTimeout> | null;
  }>({ value, dirtyTimeoutId: null });

  useEffect(() => {
    if (!isTransitionPending) {
      if (changedValueRef.current.dirtyTimeoutId !== null) {
        clearTimeout(changedValueRef.current.dirtyTimeoutId);
      }
      changedValueRef.current.dirtyTimeoutId = null;
    }
  }, [isTransitionPending]);

  const executePending = useCallback(() => {
    if (changedValueRef.current.dirtyTimeoutId !== null) {
      clearTimeout(changedValueRef.current.dirtyTimeoutId);
      changedValueRef.current.dirtyTimeoutId = null;

      externalOnChangeRef.current(changedValueRef.current.value);
    }
  }, [externalOnChangeRef]);

  return [
    {
      value,
      onChange: useCallback(
        (value: V) => {
          setValue(value);
          changedValueRef.current = {
            value,
            dirtyTimeoutId:
              changedValueRef.current.dirtyTimeoutId ??
              setTimeout(executePending, debounceTimeRef.current),
          };
          // Immediately propagate the change to the outside as part of a
          // transition.
          startTransition(() => externalOnChangeRef.current(value));
        },
        [setValue, debounceTimeRef, executePending, externalOnChangeRef]
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
    isTransitionPending,
  ] as const;
}
