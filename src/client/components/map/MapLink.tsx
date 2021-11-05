import React, { useMemo, useState } from "react";
import { GRID_SIZE } from "../../../shared/constants";
import { RRMapLink, RRMapObject } from "../../../shared/state";
import { useMyProps } from "../../myself";
import { useServerState } from "../../state";
import { MapListEntry } from "../Maps";
import { Popover } from "../Popover";
import { RoughCircle, RoughText } from "../rough";

export const MAP_LINK_SIZE = GRID_SIZE / 2;

export function MapLink({
  link,
  canStartMoving,
  onStartMove,
}: {
  link: RRMapLink;
  canStartMoving: boolean;
  onStartMove: (object: RRMapObject, event: React.MouseEvent) => void;
}) {
  const myself = useMyProps("id", "isGM");
  const canControl =
    !link.locked &&
    canStartMoving &&
    (link.playerId === myself.id || myself.isGM);
  const style = useMemo(
    () => (canControl ? { cursor: "move" } : {}),
    [canControl]
  );
  const mapName = useServerState(
    (state) => state.maps.entities[link.mapId]?.settings.name
  );
  const players = useServerState((state) => state.players);
  const [menuVisible, setMenuVisible] = useState(false);

  const onMouseDown = (e: React.MouseEvent<SVGElement>) => {
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
    <Popover
      content={
        <div onMouseDown={(e) => e.stopPropagation()}>
          <MapListEntry players={players} mapId={link.mapId} />
        </div>
      }
      visible={menuVisible}
      onClickOutside={() => setMenuVisible(false)}
      interactive
      placement="right"
    >
      <g
        style={style}
        className="map-link"
        onMouseDown={canControl ? onMouseDown : undefined}
        // TODO: rotate
        transform={`translate(${link.position.x}, ${link.position.y})`}
      >
        <RoughText x={0} y={-5} dominantBaseline="text-bottom">
          {mapName}
        </RoughText>
        <RoughCircle
          x={0}
          y={0}
          d={MAP_LINK_SIZE}
          fill={link.color}
          fillStyle="solid"
          roughness={1}
          seed={link.id}
        />
      </g>
    </Popover>
  );
}
