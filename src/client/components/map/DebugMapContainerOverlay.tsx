import React from "react";
import { RRMapObject } from "../../../shared/state";
import { identityHash } from "../../../shared/util";
import { useServerState } from "../../state";
import { CollapsibleWithLocalState } from "../Collapsible";

export function DebugMapContainerOverlay(props: {
  localMapObjects: RRMapObject[];
  serverMapObjects: RRMapObject[];
}) {
  const mapObjectIds = [
    ...new Set([
      ...props.localMapObjects.map((t) => t.id),
      ...props.serverMapObjects.map((t) => t.id),
    ]),
  ];
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
                props.serverMapObjects.find(
                  (each) => each.id === mapObjectId
                ) ?? null;
              const localMapObject =
                props.localMapObjects.find((each) => each.id === mapObjectId) ??
                null;
              return (
                <tr key={mapObjectId}>
                  <td>{mapObjectId}</td>
                  <td>
                    x: {serverMapObject?.position.x}
                    <br />
                    y: {serverMapObject?.position.y}
                  </td>
                  <td>
                    x: {localMapObject?.position.x}
                    <br />
                    y: {localMapObject?.position.y}
                  </td>
                  <td>
                    {localMapObject && serverMapObject && (
                      <>
                        x:{" "}
                        {localMapObject.position.x - serverMapObject.position.x}
                        <br />
                        y:{" "}
                        {localMapObject.position.y - serverMapObject.position.y}
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
                props.serverMapObjects.find(
                  (each) => each.id === mapObjectId
                ) ?? null;
              const localMapObject =
                props.localMapObjects.find((each) => each.id === mapObjectId) ??
                null;

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
                props.serverMapObjects.find(
                  (each) => each.id === mapObjectId
                ) ?? null;
              const localMapObject =
                props.localMapObjects.find((each) => each.id === mapObjectId) ??
                null;

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
        title="Ephermal players"
      >
        <DebugEphermalPlayers />
      </CollapsibleWithLocalState>
    </div>
  );
}

function DebugEphermalPlayers() {
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
