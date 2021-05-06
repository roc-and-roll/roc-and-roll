import React from "react";
import { useRRSimpleSound } from "../../sound";
// update acknowledgements if changed
import click from "../../../third-party/freesound.org/256116__kwahmah-02__click.mp3";

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function Button(props, ref) {
  const [play] = useRRSimpleSound(click);

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
