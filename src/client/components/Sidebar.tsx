import clsx from "clsx";
import React, { Suspense, useEffect, useState } from "react";
import { DiceRoller } from "./DiceRoller";
import { LocalStateExample } from "./LocalStateExample";
import { Log } from "./Log";
import { UploadFileExample } from "./UploadFileExample";
import styles from "./Sidebar.module.css";
import { useMyself } from "../myself";

export function Sidebar({
  className,
  logout,
}: {
  className: string;
  logout: () => void;
}) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setCount((count) => count + 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const myself = useMyself();

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

      <h2>Player</h2>
      <p>Name: {myself.name}</p>
      <p>Is GM: {myself.isGM ? "yes" : "no"}</p>
      <button onClick={logout}>logout</button>

      <h2>Version</h2>
      <p>Environment: {process.env.NODE_ENV}</p>
      {/* Git commit */}
      <p>Version: {__VERSION__}</p>
    </div>
  );
}
