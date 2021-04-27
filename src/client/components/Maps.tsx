import React from "react";
import { mapAdd, playerUpdate } from "../../shared/actions";
import { randomColor } from "../../shared/colors";
import { entries } from "../../shared/state";
import { useMyself } from "../myself";
import { useServerDispatch, useServerState } from "../state";
import { GMArea } from "./GMArea";
import { Button } from "./ui/Button";

export function Maps() {
  const dispatch = useServerDispatch();
  const myself = useMyself();
  const maps = useServerState((state) => state.maps);
  const players = useServerState((state) => state.players);

  return (
    <GMArea>
      <ul>
        {entries(maps).map((map) => (
          <li key={map.id}>
            <strong>{map.name}</strong>
            <br />
            {entries(players)
              .filter((player) => player.currentMap === map.id)
              .map((player) => player.name)
              .join(", ")}
            <div>
              <Button
                onClick={() =>
                  players.ids.map((id) =>
                    dispatch(
                      playerUpdate({ id, changes: { currentMap: map.id } })
                    )
                  )
                }
              >
                move everyone here
              </Button>
              <Button
                onClick={() =>
                  dispatch(
                    playerUpdate({
                      id: myself.id,
                      changes: { currentMap: map.id },
                    })
                  )
                }
              >
                go here
              </Button>
            </div>
          </li>
        ))}
        <li>
          <Button
            onClick={() => {
              const name = prompt("Enter the name of the map")?.trim();
              if (name === undefined || name.length === 0) {
                return;
              }

              dispatch(
                mapAdd({
                  backgroundColor: randomColor(),
                  gridEnabled: true,
                  name,
                  objects: {
                    entities: {},
                    ids: [],
                  },
                  gmWorldPosition: { x: 0, y: 0 },
                })
              );
            }}
          >
            add new map
          </Button>
        </li>
      </ul>
    </GMArea>
  );
}
