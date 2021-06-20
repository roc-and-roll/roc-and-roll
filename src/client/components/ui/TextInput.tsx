import clsx from "clsx";
import React from "react";
import { DEFAULT_TEXT_INPUT_DEBOUNCE_TIME } from "../../../shared/constants";
import { useDebouncedField, useIsolatedValue } from "../../debounce";

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

export const DebouncedTextInput = React.forwardRef<
  HTMLInputElement,
  TextInputProps & { debounce?: number }
>(function DebouncedTextInput(props, ref) {
  const [fieldProps, isPending] = useDebouncedField<string, HTMLInputElement>({
    debounce: DEFAULT_TEXT_INPUT_DEBOUNCE_TIME,
    ...props,
  });

  return <TextInput ref={ref} {...fieldProps} />;
});

type IntegerInputProps = Omit<TextInputProps<number>, "type">;

export const DebouncedIntegerInput = React.forwardRef<
  HTMLInputElement,
  IntegerInputProps
>(function DebouncedIntegerInput(
  { value: externalValue, onChange: externalOnChange, ...props },
  ref
) {
  const [value, onChange, { reportChangesRef }] = useIsolatedValue({
    value: externalValue.toString(),
    onChange: (value) => {
      externalOnChange(parseInt(value));
    },
  });

  return (
    <DebouncedTextInput
      ref={ref}
      value={value}
      onChange={(value) => {
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

export const DebouncedTextareaInput = React.forwardRef<
  HTMLTextAreaElement,
  TextareaInputProps & { debounce?: number }
>(function DebouncedTextareaInput(props, ref) {
  const [fieldProps, isPending] = useDebouncedField<
    string,
    HTMLTextAreaElement
  >({
    debounce: DEFAULT_TEXT_INPUT_DEBOUNCE_TIME,
    ...props,
  });

  return <TextareaInput ref={ref} {...fieldProps} />;
});
