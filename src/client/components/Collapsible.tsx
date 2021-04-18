import React, { useState } from "react";
import { CollapseButton } from "./CollapseButton";

export function Collapsible(
  props: React.PropsWithChildren<{
    defaultCollapsed?: boolean;
    title: React.ReactNode;
  }>
) {
  const [collapsed, setCollapsed] = useState(props.defaultCollapsed ?? false);

  return (
    <div>
      <div className="collapsible-header">
        <h2>{props.title}</h2>
        <CollapseButton collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>
      {!collapsed && props.children}
    </div>
  );
}
