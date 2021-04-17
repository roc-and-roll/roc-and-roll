import clsx from "clsx";
import React, { Suspense, useEffect, useState } from "react";
import { DiceRoller } from "./DiceRoller";
import { LocalStateExample } from "./LocalStateExample";
import { DiceInput } from "./DiceInput";
import { UploadFileExample } from "./UploadFileExample";
import styles from "./Sidebar.module.css";
import { useMyself } from "../myself";
import { TokenManager } from "./TokenManager";
import { Collapsible } from "./Collapsible";
import { useServerDispatch } from "../state";
import { playerUpdate } from "../../shared/actions";

export function Sidebar({
  className,
  logout,
}: {
  className: string;
  logout: () => void;
}) {
  const dispatch = useServerDispatch();
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
      <Collapsible title="Tokens">
        <TokenManager />
      </Collapsible>

      <Collapsible title="Dice">
        <DiceInput />
      </Collapsible>

      <Collapsible title="Player">
        <p>Name: {myself.name}</p>
        <p>
          Is GM:{" "}
          <input
            type="checkbox"
            checked={myself.isGM}
            onChange={(e) =>
              dispatch(
                playerUpdate({
                  id: myself.id,
                  changes: { isGM: e.target.checked },
                })
              )
            }
          />
        </p>
        <p>
          Color:{" "}
          <input
            type="color"
            value={myself.color}
            onChange={(e) =>
              dispatch(
                playerUpdate({
                  id: myself.id,
                  changes: { color: e.target.value },
                })
              )
            }
          />
        </p>
        <button onClick={logout}>logout</button>
      </Collapsible>

      <Collapsible title="Debug" defaultCollapsed={true}>
        {/* Including a static asset */}
        <img src="/dice.jpg" />

        <p>Count: {count}</p>
        <div
          style={{ width: "1cm", height: "1cm" }}
          className={clsx("globalClass_background_yellow", {
            [styles["localClass_text_red"]!]: count % 2,
          })}
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
    </div>
  );
}
