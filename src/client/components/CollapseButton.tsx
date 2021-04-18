import clsx from "clsx";
import React from "react";

export function CollapseButton(props: {
  className?: string;
  setCollapsed: (u: (c: boolean) => boolean) => void;
  collapsed: boolean;
}) {
  return (
    <button
      className={clsx("collapse-button", props.className)}
      onClick={() => {
        props.setCollapsed((collapsed) => !collapsed);
      }}
    >
      {props.collapsed ? "▲" : "▼"}
    </button>
  );
}
