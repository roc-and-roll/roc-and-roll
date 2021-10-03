import { IconDefinition } from "@fortawesome/fontawesome-common-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import React, { useState } from "react";
import useLocalState from "../useLocalState";
import { CollapseButton } from "./CollapseButton";
import { ErrorBoundary } from "./ErrorBoundary";

export function CollapsibleWithButton(
  props: React.PropsWithChildren<{
    defaultCollapsed?: boolean;
    title: React.ReactNode;
    buttonIcon: IconDefinition;
    buttonOnClick: CallableFunction;
  }>
) {
  const [collapsed, setCollapsed] = useState(props.defaultCollapsed ?? false);

  return (
    <CollapsibleImpl
      title={props.title}
      collapsed={collapsed}
      setCollapsed={setCollapsed}
      buttonIcon={props.buttonIcon}
      buttonOnClick={props.buttonOnClick}
    >
      {props.children}
    </CollapsibleImpl>
  );
}

export function Collapsible(
  props: React.PropsWithChildren<{
    defaultCollapsed?: boolean;
    title: React.ReactNode;
  }>
) {
  const [collapsed, setCollapsed] = useState(props.defaultCollapsed ?? false);

  return (
    <CollapsibleImpl
      title={props.title}
      collapsed={collapsed}
      setCollapsed={setCollapsed}
    >
      {props.children}
    </CollapsibleImpl>
  );
}

export function CollapsibleWithLocalState(
  props: React.PropsWithChildren<{
    defaultCollapsed?: boolean;
    title: React.ReactNode;
    localStateKey: string;
  }>
) {
  const [collapsed, setCollapsed] = useLocalState(
    props.localStateKey,
    props.defaultCollapsed ?? false
  );

  return (
    <CollapsibleImpl
      title={props.title}
      collapsed={collapsed}
      setCollapsed={setCollapsed}
    >
      {props.children}
    </CollapsibleImpl>
  );
}

function CollapsibleImpl(
  props: React.PropsWithChildren<{
    title: React.ReactNode;
    collapsed: boolean;
    setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
    buttonIcon?: IconDefinition;
    buttonOnClick?: CallableFunction;
  }>
) {
  return (
    <div>
      <div
        className={clsx("collapsible-header", {
          collapsed: !props.collapsed,
        })}
        onClick={() => {
          props.setCollapsed((collapsed) => !collapsed);
        }}
      >
        <CollapseButton collapsed={props.collapsed} setCollapsed={() => {}} />
        <h4>{props.title}</h4>
        {props.buttonIcon && props.buttonOnClick && (
          <div
            className="collapsible-action-button"
            onClick={(event) => {
              event.stopPropagation();
              if (props.buttonOnClick) props.buttonOnClick();
            }}
          >
            <FontAwesomeIcon icon={props.buttonIcon} />
          </div>
        )}
      </div>
      <div className={"collapsible-content"}>
        {!props.collapsed && <ErrorBoundary>{props.children}</ErrorBoundary>}
      </div>
    </div>
  );
}
