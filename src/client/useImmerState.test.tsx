import { act, renderHook } from "@testing-library/react";
import { Primitive } from "type-fest";
import { useImmerState } from "./useImmerState";

describe("useImmerState", () => {
  interface HookArgs<V> {
    initialValue: V;
  }

  function setup<V extends Primitive | Record<string, unknown>>(
    initialProps: HookArgs<V>
  ) {
    return renderHook(
      ({ initialValue }: HookArgs<V>) => useImmerState(initialValue),
      {
        initialProps,
      }
    );
  }

  it("works", async () => {
    const initialValue = {
      a: { aa: 42 },
      b: { bb: 42 },
    };
    const hook = setup({
      initialValue,
    });

    expect(hook.result.current[0]).toBe(initialValue);
    const setter = hook.result.current[1];
    expect(typeof setter).toBe("function");

    let nextValue = {
      a: { aa: 1337 },
      b: { bb: 1337 },
    };
    act(() => {
      hook.result.current[1](nextValue);
    });
    expect(hook.result.current[0]).toBe(nextValue);
    expect(hook.result.current[1]).toBe(setter);

    act(() => {
      hook.result.current[1]((draft) => {
        draft.a.aa = 15;
      });
    });
    expect(hook.result.current[0]).not.toBe(nextValue);
    expect(hook.result.current[0].a).not.toBe(nextValue.a);
    expect(hook.result.current[0].b).toBe(nextValue.b);
    expect(hook.result.current[1]).toBe(setter);

    nextValue = {
      a: { aa: 3 },
      b: { bb: 3 },
    };
    act(() => {
      hook.result.current[1]((draft) => {
        return nextValue;
      });
    });
    expect(hook.result.current[0]).toBe(nextValue);
    expect(hook.result.current[1]).toBe(setter);
  });
});
