import React, { useCallback, useState } from "react";
import { colors } from "../../../shared/colors";
import { Popover } from "../Popover";
import { Button } from "./Button";

export const ColorInput = React.memo(function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
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
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              title="select color"
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
