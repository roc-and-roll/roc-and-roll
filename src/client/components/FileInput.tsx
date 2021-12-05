import clsx from "clsx";
import React, { InputHTMLAttributes } from "react";

export const FileInput = React.forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "type">
>(function FileInput({ className, style, ...props }, ref) {
  return (
    <label className={clsx("file-input", className)} style={style}>
      upload file{props.multiple ? "s" : ""}
      <input ref={ref} type="file" {...props} />
    </label>
  );
});
