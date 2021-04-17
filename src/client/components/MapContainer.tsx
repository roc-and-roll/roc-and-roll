import React from "react";
import { useDrop } from "react-dnd";
import { mapUpdate } from "../../shared/actions";
import { RRToken } from "../../shared/state";
import { useMyself } from "../myself";
import { useServerDispatch, useServerState } from "../state";
import { Map } from "./Map";

export function MapContainer({ className }: { className: string }) {
  const myself = useMyself();
  const map = useServerState((s) => s.maps.entities[myself.currentMap]!);
  const dispatch = useServerDispatch();

  // TODO introduce separate add function
  const [, dropRef] = useDrop<RRToken, void, never>(() => ({
    accept: "token",
    drop: (item) => {
      if (!map.tokens.find((t) => t.tokenId === item.id))
        dispatch(
          mapUpdate({
            id: map.id,
            changes: {
              tokens: [
                ...map.tokens,
                {
                  position: { x: Math.random() * 10, y: Math.random() * 10 },
                  tokenId: item.id,
                },
              ],
            },
          })
        );
    },
  }));

  return (
    <div className={className} ref={dropRef}>
      <Map tokens={map.tokens} />
    </div>
  );
}
