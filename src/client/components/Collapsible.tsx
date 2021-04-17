import React, { useState } from "react";

export function Collapsible(
  props: React.PropsWithChildren<{ defaultCollapsed?: boolean; title: string }>
) {
  const [collapsed, setCollapsed] = useState(props.defaultCollapsed ?? false);

  return (
    <div>
      <div className="collapsible-header">
        <h2>{props.title}</h2>
        <button
          className="toggle-button"
          onClick={() => {
            setCollapsed((collapsed) => !collapsed);
          }}
        >
          {collapsed ? "▲" : "▼"}
        </button>
      </div>
      {!collapsed && props.children}
    </div>
  );
}
