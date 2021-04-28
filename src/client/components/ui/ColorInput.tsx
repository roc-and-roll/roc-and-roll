import React, { useState } from "react";
import { colors } from "../../../shared/colors";
import { Popover } from "../Popover";
import { Button } from "./Button";

export function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

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
            {colors.map((color) => (
              <Button
                key={color}
                className="color-picker-color"
                onClick={() => onChange(color)}
              >
                <div style={{ background: color }}></div>
              </Button>
            ))}
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
}
