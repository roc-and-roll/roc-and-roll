import { faAngleDown, faAngleRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import React from "react";

export function CollapseButton(props: {
  className?: string;
  setCollapsed: (u: (c: boolean) => boolean) => void;
  collapsed: boolean;
  size?: 32 | 20;
}) {
  return (
    <div
      className={clsx("collapse-button", props.className, {
        "size-20": props.size === 20,
      })}
      onClick={() => {
        props.setCollapsed((collapsed) => !collapsed);
      }}
    >
      {props.collapsed ? (
        <FontAwesomeIcon icon={faAngleRight} fixedWidth />
      ) : (
        <FontAwesomeIcon icon={faAngleDown} fixedWidth />
      )}
    </div>
  );
}
