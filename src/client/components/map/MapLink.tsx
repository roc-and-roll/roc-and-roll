import React, { useState } from "react";
import { GRID_SIZE } from "../../../shared/constants";
import { useMyProps } from "../../myself";
import { RRMapID, RRMapLink, RRMapObject } from "../../../shared/state";
import { useServerState } from "../../state";
import { MapListEntry } from "../Maps";
import { RoughCircle, RoughText } from "../rough";
import { RRMouseEvent, rrToPixiHandler } from "./pixi-utils";
import { Container } from "react-pixi-fiber";

export const MAP_LINK_SIZE = GRID_SIZE / 2;

export function MapLink({
  link,
  canStartMoving,
  onStartMove,
}: {
  link: RRMapLink;
  canStartMoving: boolean;
  onStartMove: (object: RRMapObject, event: RRMouseEvent) => void;
}) {
  const myself = useMyProps("id", "isGM");
  const canControl =
    !link.locked &&
    canStartMoving &&
    (link.playerId === myself.id || myself.isGM);
  const mapName = useServerState(
    (state) => state.maps.entities[link.mapId]?.settings.name
  );
  const [menuVisible, setMenuVisible] = useState(false);

  const onMouseDown = (e: RRMouseEvent) => {
    if (e.button === 2) {
      setMenuVisible(true);
      return;
    }

    onStartMove(link, e);
  };

  if (!mapName) {
    return null;
  }

  return (
    // TODO
    // <Popover
    //   content={<MapLinkPopover mapId={link.mapId} />}
    //   visible={menuVisible}
    //   onClickOutside={() => setMenuVisible(false)}
    //   interactive
    //   placement="right"
    // >
    <Container
      // TODO
      // className="map-link"
      interactive={canControl}
      mousedown={canControl ? rrToPixiHandler(onMouseDown) : undefined}
      // TODO: rotate
      x={link.position.x}
      y={link.position.y}
    >
      <RoughCircle
        x={0}
        y={0}
        d={MAP_LINK_SIZE}
        fill={link.color}
        fillStyle="solid"
        roughness={1}
        seed={link.id}
        cursor={canControl ? "move" : undefined}
      />
      <RoughText
        x={0}
        y={-5}
        style={{
          stroke: 0xffffff,
          strokeThickness: 4,
          lineJoin: "miter",
          fontWeight: "800",
        }}
        text={mapName}
        // TODO
        // dominantBaseline="text-bottom">
      />
    </Container>
    // </Popover>
  );
}

function MapLinkPopover({ mapId }: { mapId: RRMapID }) {
  const players = useServerState((state) => state.players);

  return (
    <div onMouseDown={(e) => e.stopPropagation()}>
      <MapListEntry players={players} mapId={mapId} />
    </div>
  );
}
