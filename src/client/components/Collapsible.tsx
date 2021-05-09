import React, { useState } from "react";
import useLocalState from "../useLocalState";
import { CollapseButton } from "./CollapseButton";

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
  }>
) {
  return (
    <div>
      <div className="collapsible-header">
        <h2>{props.title}</h2>
        <CollapseButton
          collapsed={props.collapsed}
          setCollapsed={props.setCollapsed}
        />
      </div>
      {!props.collapsed && props.children}
    </div>
  );
}
