import {
  faAngleDown,
  faAngleLeft,
  faAngleRight,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import React from "react";
import { Button } from "./ui/Button";

export function CollapseButton(props: {
  className?: string;
  setCollapsed: (u: (c: boolean) => boolean) => void;
  collapsed: boolean;
  size?: 32 | 20;
  side?: "left" | "right";
}) {
  return (
    <Button
      className={clsx("collapse-button", props.className, {
        "size-20": props.size === 20,
        "size-32": props.size === 32,
      })}
      onClick={() => {
        props.setCollapsed((collapsed) => !collapsed);
      }}
    >
      {props.collapsed ? (
        <FontAwesomeIcon
          icon={
            props.side === undefined || props.side === "left"
              ? faAngleRight
              : faAngleLeft
          }
          fixedWidth
        />
      ) : (
        <FontAwesomeIcon icon={faAngleDown} fixedWidth />
      )}
    </Button>
  );
}
