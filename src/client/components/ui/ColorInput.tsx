import composeRefs from "@seznam/compose-react-refs";
import React, { useCallback, useState } from "react";
import { colors } from "../../../shared/colors";
import { FORCE_COMMIT_FIELD_VALUE_AFTER } from "../../../shared/constants";
import { useDebouncedField } from "../../debounce";
import { Popover } from "../Popover";
import { Button } from "./Button";

type ColorInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value: string;
  onChange: (value: string) => void;
};

// Triggered errorneously for some reason:
// eslint-disable-next-line react/display-name
export const ColorInput = React.memo(
  React.forwardRef<HTMLInputElement, ColorInputProps>(function ColorInput(
    { value, onChange, ...props },
    ref
  ) {
    const [open, setOpen] = useState(false);

    const onColorButtonClick = useCallback(
      (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        onChange(e.currentTarget.dataset["color"]!);
      },
      [onChange]
    );

    return (
      <div className="color-picker">
        <Popover
          visible={open}
          onClickOutside={() => setOpen(false)}
          interactive
          placement="bottom"
          content={
            <div className="color-picker-popover">
              <input
                ref={ref}
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                title="select color"
                {...props}
              />
              <ColorButtons onColorButtonClick={onColorButtonClick} />
            </div>
          }
        >
          <Button
            onClick={() => setOpen((open) => !open)}
            className="color-picker-color"
          >
            <div style={{ background: value }} />
          </Button>
        </Popover>
      </div>
    );
  })
);

export const SmartColorInput = React.forwardRef<
  HTMLInputElement,
  ColorInputProps
>(function SmartColorInput(props, ref) {
  const [fieldProps, debouncedRef, _isPending] = useDebouncedField<
    string,
    HTMLInputElement
  >({
    debounce: FORCE_COMMIT_FIELD_VALUE_AFTER,
    ...props,
  });

  return <ColorInput ref={composeRefs(ref, debouncedRef)} {...fieldProps} />;
});

const ColorButtons = React.memo<{
  onColorButtonClick: (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => void;
}>(function ColorButtons({ onColorButtonClick }) {
  return (
    <>
      {colors.map((color) => (
        <Button
          key={color}
          className="color-picker-color"
          onClick={onColorButtonClick}
          data-color={color}
        >
          <div style={{ background: color }} />
        </Button>
      ))}
    </>
  );
});
