import React, { useEffect, useState } from "react";
import {
  EMPTY_ENTITY_COLLECTION,
  entries,
  RRMapID,
  RRMapObject,
} from "../../../shared/state";
import { identityHash } from "../../../shared/util";
import { useDEBUG__serverState, useServerState } from "../../state";
import { CollapsibleWithLocalState } from "../Collapsible";

export function DebugMapContainerOverlay({
  mapId,
  mapObjects: localMapObjects,
}: {
  mapId: RRMapID;
  mapObjects: RRMapObject[];
}) {
  const {
    serverStateWithoutOptimisticActionsAppliedRef,
    optimisticActionAppliersRef,
  } = useDEBUG__serverState();
  const serverMapObjects: RRMapObject[] = entries(
    serverStateWithoutOptimisticActionsAppliedRef.current.maps.entities[mapId]
      ?.objects ?? EMPTY_ENTITY_COLLECTION
  );

  const mapObjectIds = [
    ...new Set([
      ...localMapObjects.map((t) => t.id),
      ...serverMapObjects.map((t) => t.id),
    ]),
  ];

  // Force rerender every so often, since we use some refs (e.g.
  // serverMapObjects) which would not cause this component to re-render.
  const [_, setRerender] = useState({});
  useEffect(() => {
    const id = setInterval(() => setRerender({}), 50);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        top: 80,
        background: "orange",
        maxWidth: "100%",
        overflowY: "auto",
        maxHeight: "calc(100vh - 80px - 100px)",
      }}
    >
      <CollapsibleWithLocalState
        localStateKey="map/debug/overlay/map-object-positions"
        title="map object positions"
      >
        <table cellPadding={8}>
          <thead>
            <tr>
              <th>RRMapObjectID</th>
              <th>Server .position</th>
              <th>Local .position</th>
              <th>Diff .position</th>
            </tr>
          </thead>
          <tbody>
            {mapObjectIds.map((mapObjectId) => {
              const serverMapObject =
                serverMapObjects.find((each) => each.id === mapObjectId) ??
                null;
              const localMapObject =
                localMapObjects.find((each) => each.id === mapObjectId) ?? null;
              return (
                <tr key={mapObjectId}>
                  <td>{mapObjectId}</td>
                  <td>
                    x: {serverMapObject?.position.x}
                    <br />
                    y: {serverMapObject?.position.y}
                    <br />
                    r: {serverMapObject?.rotation}
                  </td>
                  <td>
                    x: {localMapObject?.position.x}
                    <br />
                    y: {localMapObject?.position.y}
                    <br />
                    r: {localMapObject?.rotation}
                  </td>
                  <td>
                    {localMapObject && serverMapObject && (
                      <>
                        x:{" "}
                        {localMapObject.position.x - serverMapObject.position.x}
                        <br />
                        y:{" "}
                        {localMapObject.position.y - serverMapObject.position.y}
                        <br />
                        r: {localMapObject.rotation - serverMapObject.rotation}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CollapsibleWithLocalState>
      <CollapsibleWithLocalState
        localStateKey="map/debug/overlay/rectangle-sizes"
        title="rectangle sizes"
      >
        <table cellPadding={8}>
          <thead>
            <tr>
              <th>RRMapObjectID</th>
              <th>Server .size</th>
              <th>Local .size</th>
              <th>Diff .size</th>
            </tr>
          </thead>
          <tbody>
            {mapObjectIds.map((mapObjectId) => {
              const serverMapObject =
                serverMapObjects.find((each) => each.id === mapObjectId) ??
                null;
              const localMapObject =
                localMapObjects.find((each) => each.id === mapObjectId) ?? null;

              if (
                serverMapObject?.type !== "rectangle" ||
                localMapObject?.type !== "rectangle"
              ) {
                return null;
              }

              return (
                <tr key={mapObjectId}>
                  <td>{mapObjectId}</td>
                  <td>
                    x: {serverMapObject.size.x}
                    <br />
                    y: {serverMapObject.size.y}
                  </td>
                  <td>
                    x: {localMapObject.size.x}
                    <br />
                    y: {localMapObject.size.y}
                  </td>
                  <td>
                    {
                      <>
                        x: {localMapObject.size.x - serverMapObject.size.x}
                        <br />
                        y: {localMapObject.size.y - serverMapObject.size.y}
                      </>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CollapsibleWithLocalState>
      <CollapsibleWithLocalState
        localStateKey="map/debug/overlay/hashes"
        title="hashes"
      >
        <table cellPadding={8}>
          <thead>
            <tr>
              <th>RRMapObjectID</th>
              <th>Server hash</th>
              <th>Local hash</th>
            </tr>
          </thead>
          <tbody>
            {mapObjectIds.map((mapObjectId) => {
              const serverMapObject =
                serverMapObjects.find((each) => each.id === mapObjectId) ??
                null;
              const localMapObject =
                localMapObjects.find((each) => each.id === mapObjectId) ?? null;

              return (
                <tr key={mapObjectId}>
                  <td>{mapObjectId}</td>
                  <td>
                    {serverMapObject ? identityHash(serverMapObject) : "null"}
                  </td>
                  <td>
                    {localMapObject ? identityHash(localMapObject) : "null"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CollapsibleWithLocalState>
      <CollapsibleWithLocalState
        localStateKey="map/debug/overlay/ephemeral-players"
        title="Ephemeral players"
      >
        <DebugEphemeralPlayers />
      </CollapsibleWithLocalState>
      <CollapsibleWithLocalState
        localStateKey="map/debug/overlay/optimistic-actions"
        title="Optimistic Actions"
      >
        <table cellPadding={8}>
          <thead>
            <tr>
              <th>dispatcher key</th>
              <th>key</th>
              <th>update id</th>
              <th>actions</th>
            </tr>
          </thead>
          <tbody>
            {optimisticActionAppliersRef.current.appliers().map((applier) => (
              <tr key={applier.optimisticUpdateId}>
                <td>{applier.dispatcherKey}</td>
                <td>{applier.key}</td>
                <td>{applier.optimisticUpdateId}</td>
                <td>
                  <pre>{JSON.stringify(applier.actions, null, "  ")}</pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CollapsibleWithLocalState>
    </div>
  );
}

function DebugEphemeralPlayers() {
  const ephemeralPlayers = useServerState((s) => s.ephemeral.players);

  return (
    <small>
      <pre>
        {JSON.stringify(
          Object.values(ephemeralPlayers.entities),
          undefined,
          "  "
        )}
      </pre>
    </small>
  );
}
