import React from "react";
import { useRRSound } from "../../sound";
// update acknowledgements if changed
import click from "./click.mp3";

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function Button(props, ref) {
  const [play] = useRRSound(click);

  return (
    <button
      ref={ref}
      {...props}
      onClick={(e) => {
        play();
        return props.onClick?.(e);
      }}
    />
  );
});
