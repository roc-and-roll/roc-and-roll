import composeRefs from "@seznam/compose-react-refs";
import clsx from "clsx";
import React from "react";
import { FORCE_COMMIT_FIELD_VALUE_AFTER } from "../../../shared/constants";
import {
  useFieldWithSmartOnChangeTransitions,
  useIsolatedValue,
} from "../../debounce";

type TextInputProps<T = string> = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  type?: "text" | "search" | "number";
  value: T;
  onChange: (value: T) => void;
};

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ className, type, value, onChange, ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type ?? "text"}
        className={clsx(className, "ui-text-input")}
        value={value}
        onChange={({ target: { value } }) => onChange(value)}
        {...props}
      />
    );
  }
);

export const SmartTextInput = React.forwardRef<
  HTMLInputElement,
  TextInputProps
>(function SmartTextInput(props, ref) {
  const [fieldProps, debouncedRef, isPending] =
    useFieldWithSmartOnChangeTransitions<string, HTMLInputElement>({
      debounce: FORCE_COMMIT_FIELD_VALUE_AFTER,
      ...props,
    });

  return (
    <TextInput
      ref={composeRefs(ref, debouncedRef)}
      {...fieldProps}
      // This should eventually display a spinner. However, to be able to test
      // it, we simply set a data attribute for now.
      data-ispending={isPending ? 1 : 0}
    />
  );
});

type IntegerInputProps =
  | (Omit<TextInputProps<number>, "type"> & { nullable?: false })
  | (Omit<TextInputProps<number | null>, "type"> & { nullable: true });

export const SmartIntegerInput = React.forwardRef<
  HTMLInputElement,
  IntegerInputProps
>(function SmartIntegerInput(
  { value: externalValue, onChange: externalOnChange, nullable, ...props },
  ref
) {
  const [value, onChange, { reportChangesRef }] = useIsolatedValue({
    value: externalValue === null ? "" : externalValue.toString(),
    onChange: (value) => {
      if (value === "") {
        // @ts-expect-error TS cannot infer that it is okay to assign null if
        // nullable is true.
        externalOnChange(nullable ? null : 0);
        return;
      }

      const integer = parseInt(value);
      if (isNaN(integer)) {
        throw new Error("Integer was NaN - this should never happen.");
      }
      externalOnChange(integer);
    },
  });

  return (
    <SmartTextInput
      ref={ref}
      value={value}
      onChange={(value) => {
        if (value.trim() === "") {
          reportChangesRef.current = true;
          onChange("");
          return;
        }
        const number = parseInt(value);
        reportChangesRef.current = !isNaN(number);
        onChange(value);
      }}
      type="number"
      {...props}
    />
  );
});

type TextareaInputProps = Omit<
  React.InputHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange"
> & {
  value: string;
  onChange: (e: string) => void;
};

export const TextareaInput = React.forwardRef<
  HTMLTextAreaElement,
  TextareaInputProps
>(function TextareaInput({ className, type, onChange, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={clsx(className, "ui-text-input")}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  );
});

export const SmartTextareaInput = React.forwardRef<
  HTMLTextAreaElement,
  TextareaInputProps
>(function SmartTextareaInput(props, ref) {
  const [fieldProps, debouncedRef, _isPending] =
    useFieldWithSmartOnChangeTransitions<string, HTMLTextAreaElement>({
      debounce: FORCE_COMMIT_FIELD_VALUE_AFTER,
      ...props,
    });

  return <TextareaInput ref={composeRefs(ref, debouncedRef)} {...fieldProps} />;
});
