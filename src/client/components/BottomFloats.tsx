import React from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { Log } from "./Log";

export function BottomFloats() {
  return (
    <div className="bottom-floats-wrapper">
      <div className="bottom-floats-upper">
        <ErrorBoundary>
          <Log />
        </ErrorBoundary>
      </div>
    </div>
  );
}
