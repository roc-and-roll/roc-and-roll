import React from "react";
import { playerUpdate } from "../../shared/actions";
import { useMyself } from "../myself";
import { useServerDispatch } from "../state";
import { Button } from "./ui/Button";
import { DebouncedColorInput } from "./ui/ColorInput";
import { DebouncedTextInput } from "./ui/TextInput";

export function Player({ logout }: { logout: () => void }) {
  const dispatch = useServerDispatch();
  const myself = useMyself();

  return (
    <>
      <label>
        Name
        <DebouncedTextInput
          value={myself.name}
          onChange={(name) =>
            dispatch({
              actions: [
                playerUpdate({
                  id: myself.id,
                  changes: { name },
                }),
              ],
              optimisticKey: "name",
            })
          }
        />
      </label>

      <label>
        Is GM:{" "}
        <input
          type="checkbox"
          checked={myself.isGM}
          onChange={(e) =>
            dispatch({
              actions: [
                playerUpdate({
                  id: myself.id,
                  changes: { isGM: e.target.checked },
                }),
              ],
              optimisticKey: "isGM",
            })
          }
        />
      </label>
      <label>
        Color:{" "}
        <DebouncedColorInput
          value={myself.color}
          onChange={(color) =>
            dispatch({
              actions: [
                playerUpdate({
                  id: myself.id,
                  changes: { color },
                }),
              ],
              optimisticKey: "color",
            })
          }
        />
      </label>
      <Button onClick={logout}>logout</Button>
    </>
  );
}
