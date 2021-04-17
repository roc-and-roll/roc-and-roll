import clsx from "clsx";
import React, { Suspense, useEffect, useState } from "react";
import { DiceRoller } from "./DiceRoller";
import { LocalStateExample } from "./LocalStateExample";
import { Log } from "./Log";
import { Map } from "./Map";
import { UploadFileExample } from "./UploadFileExample";
import styles from "./Sidebar.module.css";

export function Sidebar({ className }: { className: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setCount((count) => count + 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className={className}>
      <h1>Roc & Roll</h1>
      {false && (
        <Suspense fallback={null}>
          <DiceRoller />
        </Suspense>
      )}

      {/* Including a static asset */}
      <img src="/dice.jpg" />

      <p>Count: {count}</p>

      <h2>Local state example</h2>
      <LocalStateExample />

      <h2>Upload File Example</h2>
      <UploadFileExample />

      <h2>Log</h2>
      <Log />

      <div
        style={{ width: "1cm", height: "1cm" }}
        className={clsx("globalClass_background_yellow", {
          [styles["localClass_text_red"]!]: count % 2,
        })}
      />
      <p>Environment: {process.env.NODE_ENV}</p>

      {/* Git commit */}
      <p>Version: {__VERSION__}</p>
    </div>
  );
}
