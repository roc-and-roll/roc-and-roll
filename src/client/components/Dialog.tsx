import clsx from "clsx";
import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";

export function Dialog({
  open,
  onClose,
  children,
  className,
}: React.PropsWithChildren<{
  open: boolean;
  onClose: () => void;
  className?: string;
}>) {
  // Focus the dialog when it is opened.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) {
      ref.current?.focus();
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return ReactDOM.createPortal(
    <div
      ref={ref}
      className={clsx("dialog-backdrop", className)}
      onClick={(e) => e.currentTarget === e.target && onClose()}
      // tabIndex = -1 allows us to set focus on the div.
      tabIndex={-1}
    >
      <div className="dialog-modal">{children}</div>
    </div>,
    document.body
  );
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function DialogTitle({ children }: React.PropsWithChildren<{}>) {
  return <h1 className="dialog-title">{children}</h1>;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function DialogContent({ children }: React.PropsWithChildren<{}>) {
  return <div className="dialog-content">{children}</div>;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function DialogActions({ children }: React.PropsWithChildren<{}>) {
  return <div className="dialog-actions">{children}</div>;
}
