import React, { useState, useEffect } from "react";
import { Collapsible } from "./Collapsible";
import { LocalStateExample } from "./LocalStateExample";
import { UploadFileExample } from "./UploadFileExample";

export function Debug() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setCount((count) => count + 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <Collapsible title="Debug" defaultCollapsed={true}>
      {/* Including a static asset */}
      <img src="/dice.jpg" />

      <p>Count: {count}</p>
      <div
        style={{
          width: "1cm",
          height: "1cm",
          background: count % 2 === 0 ? "red" : "yellow",
        }}
      />

      <h2>Local state example</h2>
      <LocalStateExample />
      <h2>Upload File Example</h2>
      <UploadFileExample />

      <h2>Version</h2>
      <p>Environment: {process.env.NODE_ENV}</p>
      {/* Git commit */}
      <p>Version: {__VERSION__}</p>
    </Collapsible>
  );
}
