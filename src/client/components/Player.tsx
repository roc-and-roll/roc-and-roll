import React from "react";
import { playerUpdate } from "../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../shared/constants";
import { RRCharacterID } from "../../shared/state";
import { empty2Null } from "../../shared/util";
import { useMyself } from "../myself";
import { useServerDispatch, useServerState } from "../state";
import { Button } from "./ui/Button";
import { SmartColorInput } from "./ui/ColorInput";
import { Select } from "./ui/Select";
import { SmartTextInput } from "./ui/TextInput";

export function Player({ logout }: { logout: () => void }) {
  const dispatch = useServerDispatch();
  const myself = useMyself();
  const characters = useServerState((s) => s.characters);

  const options: { value: RRCharacterID | ""; label: string }[] =
    myself.characterIds.map((c: RRCharacterID) => {
      const character = characters.entities[c];
      return { value: c, label: character?.name ?? "" };
    });
  options.unshift({ value: "", label: "" });

  return (
    <>
      <label>
        Name
        <SmartTextInput
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
              syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
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
              syncToServerThrottle: 0,
            })
          }
        />
      </label>
      <label>
        Color:{" "}
        <SmartColorInput
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
              syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
            })
          }
        />
      </label>
      <label>
        Main Character
        <Select
          value={myself.mainCharacterId ?? ""}
          onChange={(mainCharacterId) =>
            dispatch({
              actions: [
                playerUpdate({
                  id: myself.id,
                  changes: { mainCharacterId: empty2Null(mainCharacterId) },
                }),
              ],
              optimisticKey: "mainCharacterId",
              syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
            })
          }
          options={options}
        />
      </label>
      <Button onClick={logout}>logout</Button>
    </>
  );
}
