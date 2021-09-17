import clsx from "clsx";
import React, { useState } from "react";
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
  if (!open) {
    return null;
  }

  return ReactDOM.createPortal(
    <div
      className={clsx("dialog-backdrop", className)}
      onClick={(e) => e.currentTarget === e.target && onClose()}
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
