import {
  Debouncer,
  SyncedDebouncer,
  useAggregatedDebounce,
  useDebounce,
} from "./debounce";
import { renderHook } from "@testing-library/react-hooks";
import { act } from "@react-three/fiber";

describe("synced debouncer", () => {
  const TIME = 100;

  it("works", async () => {
    const START_NOW = Date.now();

    const syncedDebouncer = new SyncedDebouncer(TIME);

    expect(syncedDebouncer.getTime()).toBe(TIME);

    const fn = jest.fn();

    const { debounced, dispose } = syncedDebouncer.makeDebouncer(fn);
    expect(fn).toBeCalledTimes(0);

    jest.advanceTimersToNextTimer();
    expect(fn).toBeCalledTimes(0);

    debounced(1);
    debounced(2);
    expect(fn).toBeCalledTimes(0);

    jest.advanceTimersToNextTimer();
    expect(fn).toBeCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith(2);
    expect(Date.now() - START_NOW).toBe(TIME);

    debounced(3);
    expect(fn).toBeCalledTimes(1);

    jest.advanceTimersToNextTimer();
    expect(fn).toBeCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(3);
    expect(Date.now() - START_NOW).toBe(TIME * 2);

    debounced(4);
    expect(fn).toBeCalledTimes(2);
    dispose(false);
    expect(fn).toBeCalledTimes(2);

    jest.runAllTimers();
    expect(fn).toBeCalledTimes(2);
    expect(Date.now() - START_NOW).toBe(TIME * 2);

    expect(() => debounced()).not.toThrow();
  });

  it("executes pending callbacks on dispose if instructed so", async () => {
    const START_NOW = Date.now();
    const syncedDebouncer = new SyncedDebouncer(TIME);

    const fn = jest.fn();

    const { debounced, dispose } = syncedDebouncer.makeDebouncer(fn);

    debounced(1);
    debounced(2);
    debounced(3);
    expect(fn).toBeCalledTimes(0);

    dispose(true);
    expect(fn).toBeCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith(3);

    jest.runAllTimers();
    expect(fn).toBeCalledTimes(1);
    expect(Date.now() - START_NOW).toBe(0);
  });
});

describe("useDebounce", () => {
  type HookArgs<A extends unknown[]> = {
    callback: (...args: A) => unknown;
    debounce: Debouncer;
    forceOnUnmount: boolean;
  };

  const TIME = 100;

  function setup<A extends unknown[]>(initialProps: HookArgs<A>) {
    return renderHook(
      ({ callback, debounce, forceOnUnmount }: HookArgs<A>) =>
        useDebounce<A>(callback, debounce, forceOnUnmount),
      {
        initialProps,
      }
    );
  }

  it.each`
    forceOnUnmount | debounce
    ${true}        | ${TIME}
    ${false}       | ${TIME}
    ${true}        | ${new SyncedDebouncer(TIME)}
    ${false}       | ${new SyncedDebouncer(TIME)}
  `("works", async ({ forceOnUnmount, debounce }) => {
    const START_NOW = Date.now();
    const callback = jest.fn();

    const hook = setup({
      callback,
      debounce,
      forceOnUnmount,
    });

    expect(typeof hook.result.current[0]).toBe("function");

    jest.runAllTimers();
    expect(Date.now() - START_NOW).toBe(0);
    expect(callback).toBeCalledTimes(0);

    act(() => {
      hook.result.current[0](1, "a");
      hook.result.current[0](2, "b");
    });
    expect(callback).toBeCalledTimes(0);

    jest.runAllTimers();
    expect(Date.now() - START_NOW).toBe(TIME);
    expect(callback).toBeCalledTimes(1);
    expect(callback).toHaveBeenLastCalledWith(2, "b");

    act(() => {
      hook.result.current[0](3, "c");
    });
    expect(callback).toBeCalledTimes(1);

    jest.runAllTimers();
    expect(Date.now() - START_NOW).toBe(TIME * 2);
    expect(callback).toBeCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith(3, "c");

    act(() => {
      hook.result.current[0](4, "d");
    });
    expect(callback).toBeCalledTimes(2);
    expect(Date.now() - START_NOW).toBe(TIME * 2);

    hook.unmount();

    if (forceOnUnmount) {
      expect(callback).toBeCalledTimes(3);
      expect(callback).toHaveBeenLastCalledWith(4, "d");
    } else {
      expect(callback).toBeCalledTimes(2);
    }
    expect(Date.now() - START_NOW).toBe(TIME * 2);

    jest.runAllTimers();
    if (forceOnUnmount) {
      expect(callback).toBeCalledTimes(3);
    } else {
      expect(callback).toBeCalledTimes(2);
    }

    // The identity of the debounced function should never change.
    hook.result.all.forEach((r) => {
      expect(hook.result.current).toBe(r);
    });
  });
});

describe("useAggregatedDebounce", () => {
  type HookArgs<A extends unknown[]> = {
    callback: (args: A[]) => unknown;
    debounce: Debouncer;
    forceOnUnmount: boolean;
  };

  const TIME = 100;

  function setup<A extends unknown[]>(initialProps: HookArgs<A>) {
    return renderHook(
      ({ callback, debounce, forceOnUnmount }: HookArgs<A>) =>
        useAggregatedDebounce<A>(callback, debounce, forceOnUnmount),
      {
        initialProps,
      }
    );
  }

  it.each`
    forceOnUnmount | debounce
    ${true}        | ${TIME}
    ${false}       | ${TIME}
    ${true}        | ${new SyncedDebouncer(TIME)}
    ${false}       | ${new SyncedDebouncer(TIME)}
  `("works", async ({ forceOnUnmount, debounce }) => {
    const START_NOW = Date.now();
    const callback = jest.fn();

    const hook = setup({
      callback,
      debounce,
      forceOnUnmount,
    });

    expect(typeof hook.result.current).toBe("function");

    jest.runAllTimers();
    expect(Date.now() - START_NOW).toBe(0);
    expect(callback).toBeCalledTimes(0);

    act(() => {
      hook.result.current(1, "a");
      hook.result.current(2, "b");
    });
    expect(callback).toBeCalledTimes(0);
    expect(Date.now() - START_NOW).toBe(0);

    jest.runAllTimers();
    expect(Date.now() - START_NOW).toBe(TIME);
    expect(callback).toBeCalledTimes(1);
    expect(callback).toHaveBeenLastCalledWith([
      [1, "a"],
      [2, "b"],
    ]);

    act(() => {
      hook.result.current(3, "c");
    });
    expect(callback).toBeCalledTimes(1);
    expect(Date.now() - START_NOW).toBe(TIME);

    jest.runAllTimers();
    expect(Date.now() - START_NOW).toBe(TIME * 2);
    expect(callback).toBeCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith([[3, "c"]]);

    hook.unmount();

    // The identity of the debounced function should never change.
    hook.result.all.forEach((r) => {
      expect(hook.result.current).toBe(r);
    });
  });
});
