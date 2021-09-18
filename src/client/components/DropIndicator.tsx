import React from "react";

export const DropIndicator = React.memo(function DropIndicator({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="drop-indicator">
      <div>{children}</div>
    </div>
  );
});
