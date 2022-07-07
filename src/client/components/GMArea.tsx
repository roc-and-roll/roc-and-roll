import clsx from "clsx";
import React from "react";

export function GMArea({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={clsx("gm-area", className)}>{children}</div>;
}
