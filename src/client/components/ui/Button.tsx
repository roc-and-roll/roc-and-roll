import React from "react";
import { useRRSimpleSound } from "../../sound";
// update acknowledgements if changed
import click from "../../../third-party/freesound.org/256116__kwahmah-02__click.mp3";
import clsx from "clsx";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ onClick, className, ...props }, ref) {
    const [play] = useRRSimpleSound(click);

    return (
      <button
        ref={ref}
        className={clsx("ui-button", className)}
        onClick={(e) => {
          play();
          return onClick?.(e);
        }}
        {...props}
      />
    );
  }
);
