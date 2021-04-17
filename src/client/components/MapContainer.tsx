import React, { useState } from "react";
import { useDrop } from "react-dnd";
import { mapUpdate } from "../../shared/actions";
import { RRID, RRToken } from "../../shared/state";
import { useMyself } from "../myself";
import { useServerDispatch, useServerState } from "../state";
import { Map } from "./Map";

export function MapContainer({ className }: { className: string }) {
  const myself = useMyself();
  const map = useServerState((s) => s.maps.entities[myself.currentMap]!);
  const dispatch = useServerDispatch();

  const [selectedTokens, setSelectedTokens] = useState<RRID[]>([]);

  // TODO introduce separate add function
  const [, dropRef] = useDrop<RRToken, void, never>(() => ({
    accept: "token",
    drop: (item) => {
      if (!map.tokens.find((t) => t.tokenId === item.id)) {
        const newToken = {
          position: { x: Math.random() * 10, y: Math.random() * 10 },
          tokenId: item.id,
        };
        dispatch(
          mapUpdate({
            id: map.id,
            changes: {
              tokens: [...map.tokens, newToken],
            },
          })
        );
      }
    },
  }));

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case "Delete":
        dispatch(
          mapUpdate({
            id: map.id,
            changes: {
              tokens: map.tokens.filter(
                (t) => !selectedTokens.includes(t.tokenId)
              ),
            },
          })
        );
        break;
    }
  };

  const tokens = useServerState((s) => s.tokens);

  return (
    <div className={className} ref={dropRef}>
      <Map
        tokens={tokens}
        onMoveTokens={(dx, dy) => {
          dispatch(
            mapUpdate({
              id: map.id,
              changes: {
                tokens: map.tokens.map((t) =>
                  selectedTokens.includes(t.tokenId)
                    ? {
                        ...t,
                        position: {
                          x: t.position.x + dx,
                          y: t.position.y + dy,
                        },
                      }
                    : t
                ),
              },
            })
          );
        }}
        tokensOnMap={map.tokens}
        selectedTokens={selectedTokens}
        onSelectTokens={(t) => setSelectedTokens(t.map((t) => t.tokenId))}
        handleKeyDown={handleKeyDown}
      />
    </div>
  );
}
