import React, { Suspense, useState } from "react";
import { render, act, fireEvent } from "@testing-library/react";
import { SmartIntegerInput, SmartTextInput } from "./TextInput";
import { FORCE_COMMIT_FIELD_VALUE_AFTER } from "../../../shared/constants";
import { assertNever } from "../../../shared/util";

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
      input.focus();
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
        input.focus();
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

  it("triggers onChange with 0 if the value is invalid", () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = render(
      <SmartIntegerInput value={3} onChange={onChange} placeholder="input" />
    );

    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      getByPlaceholderText("input").focus();
      fireEvent.change(getByPlaceholderText("input"), {
        target: { value: "abc" },
      });
    });

    expect(onChange).toHaveBeenCalledWith(0);

    act(() => {
      fireEvent.change(getByPlaceholderText("input"), {
        target: { value: "" },
      });
    });

    expect(onChange).toHaveBeenCalledTimes(1);

    act(() => {
      getByPlaceholderText("input").blur();
    });

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

function isPartOfTransition(): boolean {
  return (
    // @ts-expect-error There are no types for
    // __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED :)
    React["__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED"]
      .ReactCurrentBatchConfig.transition === 1
  );
}

const AlwaysSuspending = React.lazy(() => new Promise(() => {}));

describe("SmartTextInput & SmartIntegerInput", () => {
  it.each([
    ["SmartTextInput", SmartTextInput, "timeout"],
    ["SmartTextInput", SmartTextInput, "suspenseUnmount"],
    ["SmartIntegerInput", SmartIntegerInput, "timeout"],
    ["SmartIntegerInput", SmartIntegerInput, "suspenseUnmount"],
  ] as const)(
    "%s sends its latest value on %s",
    (
      componentAsString: string,
      Component: typeof SmartTextInput | typeof SmartIntegerInput,
      endWith
    ) => {
      const onChange = jest.fn();

      const Wrapper = function Wrapper({
        unmountInput,
        unmountSuspense,
      }: {
        unmountInput: boolean;
        unmountSuspense: boolean;
      }) {
        const [value, setValue] = useState("???");
        const [suspend, setSuspend] = useState(false);

        const Input =
          // @ts-expect-error Typescript thinks that we might assign the wrong
          // value to the component.
          React.createElement(Component, {
            value: componentAsString === "SmartTextInput" ? "123" : 123,
            onChange: (value: string | number) => {
              setSuspend(true);
              setValue(value.toString());

              onChange(value, isPartOfTransition());
            },
            placeholder: "input",
          });

        //cspell: disable
        return (
          <Suspense fallback={null}>
            <p data-testid="value">{value}</p>
            {!unmountSuspense && suspend && <AlwaysSuspending />}
            {!unmountInput && Input}
          </Suspense>
        );
        //cspell: enable
      };

      const { rerender, getByPlaceholderText, getByTestId } = render(
        <Wrapper unmountInput={false} unmountSuspense={false} />
      );

      expect(onChange).not.toHaveBeenCalled();
      expect(getByTestId("value").textContent).toBe("???");

      act(() => {
        getByPlaceholderText("input").focus();
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

      // onChange should have been called as part of a transition for each
      // change event. However, since the transitions never finish (we
      // deliberately mount a component that suspends forever), the updated
      // value should not be reflected in the DOM.
      expect(onChange.mock.calls).toEqual([
        [componentAsString === "SmartTextInput" ? "4" : 4, true],
        [componentAsString === "SmartTextInput" ? "45" : 45, true],
        [componentAsString === "SmartTextInput" ? "456" : 456, true],
      ]);
      expect(getByTestId("value").textContent).toBe("???");
      expect(getByPlaceholderText("input").dataset["ispending"]).toBe("1");

      switch (endWith) {
        case "timeout":
          act(() => {
            jest.advanceTimersByTime(FORCE_COMMIT_FIELD_VALUE_AFTER);
          });
          expect(onChange).toHaveBeenCalledTimes(4);
          expect(onChange).toHaveBeenLastCalledWith(
            componentAsString === "SmartTextInput" ? "456" : 456,
            false
          );
          expect(getByTestId("value").textContent).toBe("???");
          expect(getByPlaceholderText("input").dataset["ispending"]).toBe("1");

          rerender(<Wrapper unmountInput={false} unmountSuspense={true} />);

          expect(getByTestId("value").textContent).toBe("456");
          expect(getByPlaceholderText("input").dataset["ispending"]).toBe("0");

          expect(onChange).toHaveBeenCalledTimes(4);
          break;
        case "suspenseUnmount":
          rerender(<Wrapper unmountInput={false} unmountSuspense={true} />);
          expect(getByTestId("value").textContent).toBe("456");
          expect(getByPlaceholderText("input").dataset["ispending"]).toBe("0");

          expect(onChange).toHaveBeenCalledTimes(3);
          break;
        default:
          assertNever(endWith);
      }
    }
  );
});
