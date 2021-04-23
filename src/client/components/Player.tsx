import React from "react";
import { playerUpdate } from "../../shared/actions";
import { useMyself } from "../myself";
import { useDebouncedServerUpdate, useServerDispatch } from "../state";
import { Button } from "./ui/Button";

export function Player({ logout }: { logout: () => void }) {
  const dispatch = useServerDispatch();
  const myself = useMyself();

  const [name, setName] = useDebouncedServerUpdate(
    myself.name,
    (name) =>
      playerUpdate({
        id: myself.id,
        changes: { name },
      }),
    1000
  );

  const [color, setColor] = useDebouncedServerUpdate(
    myself.color,
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
      <p>
        Color:{" "}
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
      </p>
      <Button onClick={logout}>logout</Button>
    </>
  );
}
