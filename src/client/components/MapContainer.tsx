import React, { useState } from "react";
import { useDrop } from "react-dnd";
import { mapUpdate } from "../../shared/actions";
import { RRToken, RRTokenOnMap } from "../../shared/state";
import { useMyself } from "../myself";
import { useServerDispatch, useServerState } from "../state";
import { Map } from "./Map";

export function MapContainer({ className }: { className: string }) {
  const myself = useMyself();
  const map = useServerState((s) => s.maps.entities[myself.currentMap]!);
  const dispatch = useServerDispatch();

  const [selectedTokens, setSelectedTokens] = useState<RRTokenOnMap[]>([]);

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
                  position: { x: Math.random() * 100, y: Math.random() * 100 },
                  tokenId: item.id,
                },
              ],
            },
          })
        );
    },
  }));

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case "Delete":
        dispatch(
          mapUpdate({
            id: map.id,
            changes: {
              tokens: map.tokens.filter((t) => !selectedTokens.includes(t)),
            },
          })
        );
        break;
    }
  };

  return (
    <div className={className} ref={dropRef}>
      <Map
        tokensOnMap={map.tokens}
        selectedTokens={selectedTokens}
        onSelectTokens={setSelectedTokens}
        handleKeyDown={handleKeyDown}
      />
    </div>
  );
}
