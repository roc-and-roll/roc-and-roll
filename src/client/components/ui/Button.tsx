import React from "react";
import { useRRSimpleSound } from "../../sound";
// update acknowledgements if changed
//cspell: disable-next-line
import click from "../../../third-party/freesound.org/256116__kwahmah-02__click.mp3";
import clsx from "clsx";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  unstyled?: boolean;
  small?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ onClick, className, unstyled, small, ...props }, ref) {
    const [play] = useRRSimpleSound(click);

    return (
      <button
        ref={ref}
        className={clsx(
          unstyled !== true && "ui-button",
          className,
          small && "w-6 h-6 flex items-center justify-center"
        )}
        onClick={(e) => {
          play();
          return onClick?.(e);
        }}
        {...props}
      />
    );
  }
);
