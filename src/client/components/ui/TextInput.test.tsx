import React from "react";
import { render, act, fireEvent } from "@testing-library/react";
import { SmartIntegerInput, SmartTextInput } from "./TextInput";

// TODO: These tests no longer make sense now that we always trigger onChange
// wrapped in a startTransition.
/*
describe("SmartTextInput", () => {
  function setup(value: string, onChange: (v: string) => void) {
    const { rerender, unmount } = render(
      <label>
        test
        <SmartTextInput value={value} onChange={onChange} />
      </label>
    );

    return {
      rerender: (value: string, onChange: (v: string) => void) =>
        rerender(
          <label>
            test
            <SmartTextInput value={value} onChange={onChange} />
          </label>
        ),
      unmount,
    };
  }

  it("works", () => {
    const START_NOW = Date.now();

    const setValue = jest.fn();
    const { rerender, unmount } = setup("123", (value) => setValue(value));

    const input = screen.getByLabelText("test") as HTMLInputElement;

    act(() => {
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "abc" } });
      // Do not blur here
    });
    expect(input.value).toBe("abc");
    expect(setValue).not.toHaveBeenCalled();

    // Trigger an external state update -> the value in the input should not
    // be overwritten, because it is still focused.
    rerender("blah", (value) => setValue(value));

    expect(input.value).toBe("abc");
    expect(setValue).not.toHaveBeenCalled();

    act(() => {
      jest.runAllTimers();
    });
    expect(Date.now() - START_NOW).toBe(FORCE_COMMIT_FIELD_VALUE_AFTER);
    expect(setValue).toHaveBeenCalledWith("abc");

    act(() => {
      fireEvent.blur(input);
    });

    unmount();
    expect(setValue).toHaveReturnedTimes(1);
  });

  it.each([["blur"], ["enter"]] as const)(
    "propagates the value on %s",
    (type) => {
      const setValue = jest.fn();
      const { unmount } = setup("123", (value) => setValue(value));

      const input = screen.getByLabelText("test") as HTMLInputElement;

      act(() => {
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: "abc" } });
        // Do not blur here
      });
      expect(input.value).toBe("abc");
      expect(setValue).not.toHaveBeenCalled();

      act(() => {
        switch (type) {
          case "blur":
            fireEvent.blur(input);
            break;
          case "enter":
            fireEvent.keyPress(input, { key: "Enter", code: 13, charCode: 13 });
            break;
          default:
            assertNever(type);
        }
      });

      expect(setValue).toHaveBeenCalledWith("abc");
      expect(jest.getTimerCount()).toBe(0);

      unmount();
      expect(setValue).toHaveReturnedTimes(1);
    }
  );
});
*/

describe("SmartIntegerInput", () => {
  test("it does not trigger onChange unnecessarily", () => {
    const onChange = jest.fn();
    const { rerender, getByPlaceholderText } = render(
      <SmartIntegerInput value={123} onChange={onChange} placeholder="number" />
    );

    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      rerender(
        <SmartIntegerInput
          value={123}
          onChange={onChange}
          placeholder="number"
        />
      );
    });

    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      rerender(
        <SmartIntegerInput
          value={456}
          onChange={onChange}
          placeholder="number"
        />
      );
    });

    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      fireEvent.change(getByPlaceholderText("number"), {
        target: { value: "789" },
      });
    });

    act(() => {
      jest.runAllTimers();
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(789);
  });

  test("the types are correct for nullable and non-nullable inputs", () => {
    const nullableValue: number | null = null;
    const nullableOnChange = (v: number | null) => {};
    const _nullable = (
      <SmartIntegerInput
        value={nullableValue}
        onChange={nullableOnChange}
        nullable
      />
    );

    const value = 123 as number;
    const onChange = (v: number) => {};
    const _nonNullable = (
      <SmartIntegerInput value={value} onChange={onChange} />
    );
  });
});

describe("SmartTextInput & SmartIntegerInput", () => {
  it.each([
    ["SmartTextInput", SmartTextInput, "123", "456"],
    ["SmartIntegerInput", SmartIntegerInput, 123, 456],
  ] as const)(
    "%s sends its latest value on unmount",
    (
      _componentAsString: string,
      Component: typeof SmartTextInput | typeof SmartIntegerInput,
      initialValue,
      endValue
    ) => {
      // @ts-ignore
      globalThis.DISABLE_TRANSITION_FOR_TEST = true;

      const onChange = jest.fn();
      const { unmount, getByPlaceholderText } = render(
        // @ts-expect-error Typescript thinks that we might assign the wrong
        // value to the component.
        React.createElement(Component, {
          value: initialValue,
          onChange: onChange,
          placeholder: "input",
        })
      );

      expect(onChange).not.toHaveBeenCalled();

      act(() => {
        fireEvent.focus(getByPlaceholderText("input"));
        fireEvent.change(getByPlaceholderText("input"), {
          target: { value: "4" },
        });
        fireEvent.change(getByPlaceholderText("input"), {
          target: { value: "45" },
        });
        fireEvent.change(getByPlaceholderText("input"), {
          target: { value: "456" },
        });
      });

      expect(onChange).toHaveBeenCalledTimes(0);

      unmount();

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(endValue);
    }
  );
});
