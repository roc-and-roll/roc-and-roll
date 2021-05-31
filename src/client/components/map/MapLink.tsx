import React, { useCallback, useMemo, useState } from "react";
import { GRID_SIZE } from "../../../shared/constants";
import { byId, RRMapLink, RRMapObject } from "../../../shared/state";
import { useMyself } from "../../myself";
import { useLatest, useServerState } from "../../state";
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
  const myself = useMyself();
  const canControl =
    !link.locked && canStartMoving && link.playerId === myself.id;
  const style = useMemo(
    () => (canControl ? { cursor: "move" } : {}),
    [canControl]
  );
  const map = useServerState((state) => byId(state.maps.entities, link.mapId));
  const players = useServerState((state) => state.players);
  const [menuVisible, setMenuVisible] = useState(false);

  const ref = useLatest({ link, onStartMove });
  const onMouseDown = useCallback(
    (e: React.MouseEvent<SVGElement>) => {
      if (e.button === 2) {
        setMenuVisible(true);
        return;
      }

      ref.current.onStartMove(ref.current.link, e);
    },
    [ref]
  );

  return (
    <Popover
      content={
        map && (
          <div onMouseDown={(e) => e.stopPropagation()}>
            <MapListEntry players={players} map={map} myself={myself} />
          </div>
        )
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
          {map?.name}
        </RoughText>
        <RoughCircle
          x={0}
          y={0}
          d={MAP_LINK_SIZE}
          fill={link.color}
          fillStyle="solid"
          roughness={1}
        />
      </g>
    </Popover>
  );
}
