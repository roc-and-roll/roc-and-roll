import React, { useState } from "react";
import {
  Debouncer,
  SyncedDebounceMaker,
  useAggregatedDebounce,
  useDebounce,
  useIsolatedValue,
} from "./debounce";
import {
  renderHook,
  act,
  render,
  screen,
  fireEvent,
} from "@testing-library/react";

describe("SyncedDebounceMaker", () => {
  const TIME = 100;

  it("works", async () => {
    const START_NOW = Date.now();

    const syncedDebounceMaker = new SyncedDebounceMaker(TIME);

    expect(syncedDebounceMaker.getTime()).toBe(TIME);

    const fn = jest.fn();

    const { debouncedCallback, dispose } =
      syncedDebounceMaker.makeDebouncer(fn);
    expect(fn).toBeCalledTimes(0);

    jest.advanceTimersToNextTimer();
    expect(fn).toBeCalledTimes(0);

    debouncedCallback(1);
    debouncedCallback(2);
    expect(fn).toBeCalledTimes(0);

    jest.advanceTimersToNextTimer();
    expect(fn).toBeCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith(2);
    expect(Date.now() - START_NOW).toBe(TIME);

    debouncedCallback(3);
    expect(fn).toBeCalledTimes(1);

    jest.advanceTimersToNextTimer();
    expect(fn).toBeCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(3);
    expect(Date.now() - START_NOW).toBe(TIME * 2);

    debouncedCallback(4);
    expect(fn).toBeCalledTimes(2);
    dispose(false);
    expect(fn).toBeCalledTimes(2);

    jest.runAllTimers();
    expect(fn).toBeCalledTimes(2);
    expect(Date.now() - START_NOW).toBe(TIME * 2);

    expect(() => debouncedCallback()).not.toThrow();
  });

  it("executes pending callbacks on dispose if instructed so", async () => {
    const START_NOW = Date.now();
    const syncedDebounceMaker = new SyncedDebounceMaker(TIME);

    const fn = jest.fn();

    const { debouncedCallback, dispose } =
      syncedDebounceMaker.makeDebouncer(fn);

    debouncedCallback(1);
    debouncedCallback(2);
    debouncedCallback(3);
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
  interface HookArgs<A extends unknown[]> {
    callback: (...args: A) => unknown;
    debounce: Debouncer;
    forceOnUnmount: boolean;
  }

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
    ${true}        | ${new SyncedDebounceMaker(TIME)}
    ${false}       | ${new SyncedDebounceMaker(TIME)}
  `("works", async ({ forceOnUnmount, debounce }) => {
    const START_NOW = Date.now();
    const callback = jest.fn();

    const hook = setup({
      callback,
      debounce,
      forceOnUnmount,
    });

    const debouncer = hook.result.current[0];
    expect(typeof debouncer).toBe("function");

    jest.runAllTimers();
    expect(Date.now() - START_NOW).toBe(0);
    expect(callback).toBeCalledTimes(0);

    act(() => {
      hook.result.current[0](1, "a");
      hook.result.current[0](2, "b");
    });
    expect(callback).toBeCalledTimes(0);
    expect(hook.result.current[0]).toBe(debouncer);

    jest.runAllTimers();
    expect(Date.now() - START_NOW).toBe(TIME);
    expect(callback).toBeCalledTimes(1);
    expect(callback).toHaveBeenLastCalledWith(2, "b");
    expect(hook.result.current[0]).toBe(debouncer);

    act(() => {
      hook.result.current[0](3, "c");
    });
    expect(callback).toBeCalledTimes(1);
    expect(hook.result.current[0]).toBe(debouncer);

    jest.runAllTimers();
    expect(Date.now() - START_NOW).toBe(TIME * 2);
    expect(callback).toBeCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith(3, "c");
    expect(hook.result.current[0]).toBe(debouncer);

    act(() => {
      hook.result.current[0](4, "d");
    });
    expect(callback).toBeCalledTimes(2);
    expect(Date.now() - START_NOW).toBe(TIME * 2);
    expect(hook.result.current[0]).toBe(debouncer);

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
  });
});

describe("useAggregatedDebounce", () => {
  interface HookArgs<A extends unknown[]> {
    callback: (args: A[]) => unknown;
    debounce: Debouncer;
    forceOnUnmount: boolean;
  }

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
    ${true}        | ${new SyncedDebounceMaker(TIME)}
    ${false}       | ${new SyncedDebounceMaker(TIME)}
  `("works", async ({ forceOnUnmount, debounce }) => {
    const START_NOW = Date.now();
    const callback = jest.fn();

    const hook = setup({
      callback,
      debounce,
      forceOnUnmount,
    });

    const debouncer = hook.result.current;
    expect(typeof debouncer).toBe("function");
    expect(hook.result.current).toBe(debouncer);

    jest.runAllTimers();
    expect(Date.now() - START_NOW).toBe(0);
    expect(callback).toBeCalledTimes(0);

    act(() => {
      hook.result.current(1, "a");
      hook.result.current(2, "b");
    });
    expect(callback).toBeCalledTimes(0);
    expect(Date.now() - START_NOW).toBe(0);
    expect(hook.result.current).toBe(debouncer);

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
    expect(hook.result.current).toBe(debouncer);

    jest.runAllTimers();
    expect(Date.now() - START_NOW).toBe(TIME * 2);
    expect(callback).toBeCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith([[3, "c"]]);
    expect(hook.result.current).toBe(debouncer);

    hook.unmount();
  });
});

describe("useIsolatedValue", () => {
  function setup(initialValue: string) {
    function TestComponent({
      initialValue: initialExternalValue,
    }: {
      initialValue: string;
    }) {
      const [externalValue, externalOnChange] = useState(initialExternalValue);

      const [
        internalValue,
        internalOnChange,
        { takeValueRef, reportChangesRef },
      ] = useIsolatedValue({
        value: externalValue,
        onChange: externalOnChange,
      });

      return (
        <>
          <input
            type="checkbox"
            defaultChecked={true}
            onClick={(e) => {
              takeValueRef.current = !takeValueRef.current;
            }}
            aria-label="ext - int"
          />
          <input
            type="checkbox"
            defaultChecked={true}
            onClick={(e) => {
              reportChangesRef.current = !reportChangesRef.current;
            }}
            aria-label="int - ext"
          />
          <input
            value={internalValue}
            onChange={(e) => internalOnChange(e.target.value)}
            aria-label="internal-input"
          />
          <input
            value={externalValue}
            onChange={(e) => externalOnChange(e.target.value)}
            aria-label="external-input"
          />
        </>
      );
    }

    render(<TestComponent initialValue={initialValue} />);
    const internalInput = screen.getByLabelText(
      "internal-input"
    ) as HTMLInputElement;
    const externalInput = screen.getByLabelText(
      "external-input"
    ) as HTMLInputElement;

    const extToIntCheckbox = screen.getByLabelText(
      "ext - int"
    ) as HTMLInputElement;
    const intToExtCheckbox = screen.getByLabelText(
      "int - ext"
    ) as HTMLInputElement;

    return { internalInput, externalInput, extToIntCheckbox, intToExtCheckbox };
  }

  it("passes through values by default", () => {
    const { internalInput, externalInput, extToIntCheckbox, intToExtCheckbox } =
      setup("123");

    expect(internalInput.value).toBe("123");
    expect(externalInput.value).toBe("123");
    expect(extToIntCheckbox.checked).toBe(true);
    expect(intToExtCheckbox.checked).toBe(true);

    act(() => {
      fireEvent.change(internalInput, {
        target: { value: "foo" },
      });
    });
    expect(internalInput.value).toBe("foo");
    expect(externalInput.value).toBe("foo");

    act(() => {
      fireEvent.change(externalInput, {
        target: { value: "bar" },
      });
    });
    expect(internalInput.value).toBe("bar");
    expect(externalInput.value).toBe("bar");
  });

  it("can ignore external value changes", () => {
    const { internalInput, externalInput, extToIntCheckbox } = setup("start");

    expect(internalInput.value).toBe("start");
    expect(externalInput.value).toBe("start");

    act(() => {
      fireEvent.click(extToIntCheckbox, {
        target: { checked: false },
      });
      fireEvent.change(externalInput, {
        target: { value: "external" },
      });
    });

    expect(internalInput.value).toBe("start");
    expect(externalInput.value).toBe("external");

    act(() => {
      fireEvent.change(internalInput, {
        target: { value: "internal" },
      });
    });

    expect(internalInput.value).toBe("internal");
    expect(externalInput.value).toBe("internal");

    act(() => {
      fireEvent.change(externalInput, {
        target: { value: "external" },
      });
    });

    expect(internalInput.value).toBe("internal");
    expect(externalInput.value).toBe("external");

    act(() => {
      fireEvent.click(extToIntCheckbox, {
        target: { checked: true },
      });
    });

    expect(internalInput.value).toBe("internal");
    expect(externalInput.value).toBe("external");

    act(() => {
      fireEvent.change(externalInput, {
        target: { value: "external!" },
      });
    });

    expect(internalInput.value).toBe("external!");
    expect(externalInput.value).toBe("external!");
  });

  it("can ignore internal value changes", () => {
    const { internalInput, externalInput, intToExtCheckbox } = setup("start");

    expect(internalInput.value).toBe("start");
    expect(externalInput.value).toBe("start");

    act(() => {
      fireEvent.click(intToExtCheckbox, {
        target: { checked: false },
      });
      fireEvent.change(internalInput, {
        target: { value: "internal" },
      });
    });

    expect(internalInput.value).toBe("internal");
    expect(externalInput.value).toBe("start");

    act(() => {
      fireEvent.change(externalInput, {
        target: { value: "external" },
      });
    });

    expect(internalInput.value).toBe("external");
    expect(externalInput.value).toBe("external");

    act(() => {
      fireEvent.change(internalInput, {
        target: { value: "internal" },
      });
    });

    expect(internalInput.value).toBe("internal");
    expect(externalInput.value).toBe("external");

    act(() => {
      fireEvent.click(intToExtCheckbox, {
        target: { checked: true },
      });
    });

    expect(internalInput.value).toBe("internal");
    expect(externalInput.value).toBe("external");

    act(() => {
      fireEvent.change(internalInput, {
        target: { value: "internal!" },
      });
    });

    expect(internalInput.value).toBe("internal!");
    expect(externalInput.value).toBe("internal!");
  });
});
