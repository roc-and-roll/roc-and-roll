import React, { Suspense } from "react";
import { DiceRoller } from "./DiceRoller";
import { DiceInput } from "./DiceInput";
import { useMyself } from "../myself";
import { TokenManager } from "./TokenManager";
import { Collapsible } from "./Collapsible";
import { useServerDispatch } from "../state";
import { playerUpdate } from "../../shared/actions";
import { Debug } from "./Debug";
import { Resizable } from "re-resizable";
import useLocalState from "../useLocalState";

export function Sidebar({ logout }: { logout: () => void }) {
  const dispatch = useServerDispatch();
  const myself = useMyself();

  const [sidebarWidth, setSidebarWidth] = useLocalState("sidebarWidth", 450);

  return (
    <Resizable
      size={{ width: sidebarWidth, height: "100%" }}
      onResizeStop={(_1, _2, _3, sizeDelta) =>
        setSidebarWidth((width) => width + sizeDelta.width)
      }
      minWidth="10vw"
      maxWidth="90vw"
      bounds="parent"
      enable={{
        top: false,
        right: true,
        bottom: false,
        left: false,
        topRight: false,
        bottomRight: false,
        bottomLeft: false,
        topLeft: false,
      }}
      className="app-sidebar"
    >
      <div className="app-sidebar-scroll-container">
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
          <p>
            Name:{" "}
            <input
              type="text"
              value={myself.name}
              onChange={(e) =>
                dispatch(
                  playerUpdate({
                    id: myself.id,
                    changes: { name: e.target.value },
                  })
                )
              }
            />
          </p>
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
        {process.env.NODE_ENV === "development" && <Debug />}
      </div>
    </Resizable>
  );
}
