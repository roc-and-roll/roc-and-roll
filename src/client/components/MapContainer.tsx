import React, { useState } from "react";
import { useDrop } from "react-dnd";
import {
  mapTokenAdd,
  mapTokenRemove,
  mapTokenUpdate,
} from "../../shared/actions";
import { RRToken, RRTokenOnMapID } from "../../shared/state";
import { useMyself } from "../myself";
import { byId, entries, useServerDispatch, useServerState } from "../state";
import { Map } from "./Map";

export function MapContainer({ className }: { className: string }) {
  const myself = useMyself();
  const map = useServerState((s) => byId(s.maps.entities, myself.currentMap)!);
  const dispatch = useServerDispatch();

  const [selectedTokens, setSelectedTokens] = useState<RRTokenOnMapID[]>([]);

  const [, dropRef] = useDrop<RRToken, void, never>(
    () => ({
      accept: "token",
      drop: (item) => {
        dispatch(
          mapTokenAdd(map.id, {
            position: { x: Math.random() * 10, y: Math.random() * 10 },
            tokenId: item.id,
          })
        );
      },
    }),
    [dispatch, map.id]
  );

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case "Delete":
        selectedTokens.forEach((selectedTokenId) => {
          dispatch(
            mapTokenRemove({ mapId: map.id, tokenOnMapId: selectedTokenId })
          );
        });
        break;
    }
  };

  const tokens = useServerState((s) => s.tokens);

  return (
    <div className={className} ref={dropRef}>
      <Map
        tokens={tokens}
        onMoveTokens={(dx, dy) => {
          selectedTokens.forEach((selectedTokenId) => {
            const token = byId(map.tokens.entities, selectedTokenId);
            if (token) {
              dispatch(
                mapTokenUpdate(map.id, {
                  id: selectedTokenId,
                  changes: {
                    position: {
                      x: token.position.x + dx,
                      y: token.position.y + dy,
                    },
                  },
                })
              );
            }
          });
        }}
        tokensOnMap={entries(map.tokens)}
        selectedTokens={selectedTokens}
        onSelectTokens={(t) => setSelectedTokens(t.map((t) => t.id))}
        handleKeyDown={handleKeyDown}
      />
    </div>
  );
}
