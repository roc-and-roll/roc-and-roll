import React from "react";

type PassedThroughProps = Omit<
  React.HTMLAttributes<HTMLSelectElement>,
  "onChange" | "value"
>;

/**
 * A type-safe version of the <select> element, which takes an array of options
 * and a modified onChange handler that passes the selected option as its first
 * argument.
 */
export function Select<O extends string>({
  options,
  onChange,
  ...props
}: PassedThroughProps & {
  options: ReadonlyArray<{ value: O; label: string }>;
  value: O;
  onChange: (option: O) => void;
}) {
  return (
    <select {...props} onChange={(e) => onChange(e.target.value as O)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
