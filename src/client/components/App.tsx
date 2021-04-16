import "modern-css-reset";
import "./global.scss";
import React, { Suspense, useEffect, useState } from "react";
import styles from "./App.module.css";
import clsx from "clsx";
import { Log } from "./Log";
import { Map } from "./Map";
import { UploadFileExample } from "./UploadFileExample";
import { LocalStateExample } from "./LocalStateExample";
import { DiceRoller } from "./DiceRoller";

export function App() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setCount((count) => count + 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <h1>Roc & Roll</h1>
      {false && (
        <Suspense fallback={null}>
          <DiceRoller />
        </Suspense>
      )}

      {/* Including a static asset */}
      <img src="/dice.jpg" />

      <p>Count: {count}</p>

      <h2>Map</h2>
      <Map
        tokens={[
          { id: "abc", x: 30, y: 50, color: "red" },
          { id: "def", x: 80, y: 20, color: "green" },
        ]}
      />

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
    </>
  );
}
