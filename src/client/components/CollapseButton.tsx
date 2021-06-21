import { faCaretDown, faCaretLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import React from "react";
import { Button } from "./ui/Button";

export function CollapseButton(props: {
  className?: string;
  setCollapsed: (u: (c: boolean) => boolean) => void;
  collapsed: boolean;
}) {
  return (
    <Button
      className={clsx("collapse-button", props.className)}
      onClick={() => {
        props.setCollapsed((collapsed) => !collapsed);
      }}
    >
      {props.collapsed ? (
        <FontAwesomeIcon
          icon={faCaretLeft}
          fixedWidth
          transform="left-2 grow-10"
        />
      ) : (
        <FontAwesomeIcon icon={faCaretDown} fixedWidth transform="grow-10" />
      )}
    </Button>
  );
}
