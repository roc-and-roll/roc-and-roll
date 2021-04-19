import React, { Suspense } from "react";
import { DiceRoller } from "./DiceRoller";
import { DiceInput } from "./DiceInput";
import { useMyself } from "../myself";
import { TokenManager } from "./TokenManager";
import { Collapsible } from "./Collapsible";
import { useServerDispatch } from "../state";
import { playerUpdate } from "../../shared/actions";
import { Debug } from "./Debug";

export function Sidebar({
  className,
  logout,
}: {
  className: string;
  logout: () => void;
}) {
  const dispatch = useServerDispatch();
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
  );
}
