import React, { useState } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { Log } from "./Log";
import { PrivateChatsWrapper } from "./privateChat/PrivateChatsWrapper";

export function BottomFloats() {
  return (
    <div className="bottom-floats-wrapper">
      <div className="bottom-floats-upper">
        <ErrorBoundary>
          <PrivateChatsWrapper />
        </ErrorBoundary>
        <ErrorBoundary>
          <Log />
        </ErrorBoundary>
      </div>
    </div>
  );
}
