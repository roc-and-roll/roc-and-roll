import React from "react";
import { playerUpdate } from "../../shared/actions";
import { byId } from "../../shared/state";
import { useMyself } from "../myself";
import {
  useOptimisticDebouncedServerUpdate,
  useServerDispatch,
} from "../state";
import { Button } from "./ui/Button";
import { ColorInput } from "./ui/ColorInput";

export function Player({ logout }: { logout: () => void }) {
  const dispatch = useServerDispatch();
  const myself = useMyself();

  const [name, setName] = useOptimisticDebouncedServerUpdate(
    (state) => byId(state.players.entities, myself.id)?.name ?? "",
    (name) =>
      playerUpdate({
        id: myself.id,
        changes: { name },
      }),
    1000
  );

  const [color, setColor] = useOptimisticDebouncedServerUpdate(
    (state) => byId(state.players.entities, myself.id)?.color ?? "",
    (color) =>
      playerUpdate({
        id: myself.id,
        changes: { color },
      }),
    1000
  );

  return (
    <>
      <p>
        Name:{" "}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
      <div>
        Color: <ColorInput value={color} onChange={setColor} />
      </div>
      <Button onClick={logout}>logout</Button>
    </>
  );
}
