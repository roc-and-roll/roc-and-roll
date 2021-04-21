import React, { useState } from "react";
import { useDrop } from "react-dnd";
import {
  mapTokenAdd,
  mapTokenRemove,
  mapTokenUpdate,
} from "../../shared/actions";
import { RRToken, RRTokenOnMap, RRTokenOnMapID } from "../../shared/state";
import { useMyself } from "../myself";
import {
  byId,
  useDebouncedServerUpdate,
  useServerDispatch,
  useServerState,
  entries,
  setById,
} from "../state";
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

  const serverTokensOnMap = map.tokens;
  const [localTokensOnMap, setLocalTokensOnMap] = useDebouncedServerUpdate(
    serverTokensOnMap,
    (localTokensOnMap) => {
      return selectedTokens.flatMap((selectedTokenId) => {
        const tokenOnMap = byId(localTokensOnMap.entities, selectedTokenId);
        if (!tokenOnMap) {
          return [];
        }

        return mapTokenUpdate(map.id, {
          id: selectedTokenId,
          changes: {
            position: tokenOnMap.position,
          },
        });
      });
    },
    100,
    (start, end, t) => {
      const updatedTokensOnMap: Record<RRTokenOnMapID, RRTokenOnMap> = {};

      entries(end).forEach((e) => {
        const s = byId(start.entities, e.id);
        if (s) {
          setById(updatedTokensOnMap, e.id, {
            ...e,
            position: {
              x: s.position.x + (e.position.x - s.position.x) * t,
              y: s.position.y + (e.position.y - s.position.y) * t,
            },
          });
        }
      });

      return {
        ids: end.ids,
        entities: {
          ...end.entities,
          ...updatedTokensOnMap,
        },
      };
    }
  );

  const tokens = useServerState((s) => s.tokens);

  return (
    <div className={className} ref={dropRef}>
      <Map
        tokens={tokens}
        onMoveTokens={(dx, dy) => {
          setLocalTokensOnMap((tokensOnMap) => {
            const updatedTokensOnMap: Record<RRTokenOnMapID, RRTokenOnMap> = {};
            entries(tokensOnMap).forEach((each) => {
              if (selectedTokens.includes(each.id)) {
                setById(updatedTokensOnMap, each.id, {
                  ...each,
                  position: {
                    x: each.position.x + dx,
                    y: each.position.y + dy,
                  },
                });
              }
            });

            return {
              ids: tokensOnMap.ids,
              entities: {
                ...tokensOnMap.entities,
                ...updatedTokensOnMap,
              },
            };
          });
        }}
        tokensOnMap={entries(localTokensOnMap)}
        selectedTokens={selectedTokens}
        onSelectTokens={setSelectedTokens}
        handleKeyDown={handleKeyDown}
      />
      {false && process.env.NODE_ENV === "development" && (
        <DebugTokenPositions
          localTokensOnMap={entries(localTokensOnMap)}
          serverTokensOnMap={entries(serverTokensOnMap)}
        />
      )}
    </div>
  );
}

function DebugTokenPositions(props: {
  localTokensOnMap: RRTokenOnMap[];
  serverTokensOnMap: RRTokenOnMap[];
}) {
  const tokenOnMapIds = [
    ...new Set([
      ...props.localTokensOnMap.map((t) => t.id),
      ...props.serverTokensOnMap.map((t) => t.id),
    ]),
  ];
  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        top: 0,
        background: "orange",
        maxWidth: "100%",
      }}
    >
      <h3>Debug: token positions</h3>
      <table cellPadding={8}>
        <thead>
          <tr>
            <th>RRTokenOnMapID</th>
            <th>Server .position</th>
            <th>Local .position</th>
            <th>Diff .position</th>
          </tr>
        </thead>
        <tbody>
          {tokenOnMapIds.map((tokenOnMapId) => {
            const serverTokenOnMap =
              props.serverTokensOnMap.find(
                (each) => each.id === tokenOnMapId
              ) ?? null;
            const localTokenOnMap =
              props.localTokensOnMap.find((each) => each.id === tokenOnMapId) ??
              null;
            return (
              <tr key={tokenOnMapId}>
                <td>{tokenOnMapId}</td>
                <td>
                  x: {serverTokenOnMap?.position.x}
                  <br />
                  y: {serverTokenOnMap?.position.y}
                </td>
                <td>
                  x: {localTokenOnMap?.position.x}
                  <br />
                  y: {localTokenOnMap?.position.y}
                </td>
                <td>
                  {localTokenOnMap && serverTokenOnMap && (
                    <>
                      x:{" "}
                      {localTokenOnMap.position.x - serverTokenOnMap.position.x}
                      <br />
                      y:{" "}
                      {localTokenOnMap.position.y - serverTokenOnMap.position.y}
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
