import React from "react";
import { Collapsible } from "./Collapsible";
import { LocalStateExample } from "./LocalStateExample";
import { UploadFileExample } from "./UploadFileExample";
import diceImage from "./playground.jpg";

export function Playground() {
  return (
    <Collapsible title="Playground" defaultCollapsed={true}>
      {/* Using an external image */}
      <img src={diceImage} />

      <h2>Local state example</h2>
      <LocalStateExample />
      <h2>Upload File Example</h2>
      <UploadFileExample />
    </Collapsible>
  );
}
