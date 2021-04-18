import React from "react";
import { Log } from "./Log";
import { PrivateChatsWrapper } from "./privateChat/PrivateChatsWrapper";

export function BottomFloats() {
  return (
    <div className="bottom-floats-wrapper">
      <PrivateChatsWrapper />
      <Log />
    </div>
  );
}
