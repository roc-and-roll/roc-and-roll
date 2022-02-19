import { act, renderHook } from "@testing-library/react-hooks";
import { Primitive } from "type-fest";
import { useImmerState } from "./useImmerState";

describe("useDebounce", () => {
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
    expect(typeof hook.result.current[1]).toBe("function");

    let nextValue = {
      a: { aa: 1337 },
      b: { bb: 1337 },
    };
    act(() => {
      hook.result.current[1](nextValue);
    });
    expect(hook.result.current[0]).toBe(nextValue);

    act(() => {
      hook.result.current[1]((draft) => {
        draft.a.aa = 15;
      });
    });
    expect(hook.result.current[0]).not.toBe(nextValue);
    expect(hook.result.current[0].a).not.toBe(nextValue.a);
    expect(hook.result.current[0].b).toBe(nextValue.b);

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

    // The identity of the setter should never change.
    hook.result.all.forEach((r) => {
      if (!Array.isArray(r)) {
        fail();
      }

      expect(hook.result.current[1]).toBe(r[1]);
    });
  });
});
