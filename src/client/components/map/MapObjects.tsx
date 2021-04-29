import React, { useState } from "react";
import {
  byId,
  EntityCollection,
  RRColor,
  RRMapObject,
  RRMapObjectID,
  RRPlayer,
  RRToken,
  RRTokenID,
} from "../../../shared/state";
import { canViewTokenOnMap } from "../../permissions";
import { ToolButtonState } from "./MapContainer";
import { MapObjectThatIsNotAToken } from "./MapObjectThatIsNotAToken";
import { MapToken } from "./MapToken";

export const MapObjects = React.memo<{
  mapObjects: RRMapObject[];
  contrastColor: RRColor;
  myself: RRPlayer;
  toolButtonState: ToolButtonState;
  tokens: EntityCollection<RRToken>;
  selectedObjectIds: RRMapObjectID[];
  zoom: number;
  setHP: (tokenId: RRTokenID, hp: number) => void;
  handleStartMoveMapObject: (
    object: RRMapObject,
    event: React.MouseEvent
  ) => void;
}>(function MapObjects({
  mapObjects,
  contrastColor,
  myself,
  tokens,
  toolButtonState,
  zoom,
  setHP,
  handleStartMoveMapObject,
  selectedObjectIds,
}) {
  const [auraArea, setAuraArea] = useState<SVGGElement | null>(null);
  const [healthbarArea, setHealthbarArea] = useState<SVGGElement | null>(null);

  return (
    <>
      <g ref={setAuraArea} />
      {mapObjects
        // render images first, so that they always are in the background
        .sort((a, b) => +(b.type === "image") - +(a.type === "image"))
        .map((object) =>
          object.type !== "token" ? (
            <MapObjectThatIsNotAToken
              key={object.id}
              onStartMove={handleStartMoveMapObject}
              object={object}
              canStartMoving={toolButtonState === "select"}
              isSelected={selectedObjectIds.includes(object.id)}
            />
          ) : null
        )}
      {mapObjects
        .flatMap((o) => (o.type === "token" ? o : []))
        .map((object) => {
          const token = byId(tokens.entities, object.tokenId);
          if (!token || !canViewTokenOnMap(token, myself)) {
            return null;
          }

          return (
            <MapToken
              key={object.id}
              token={token}
              object={object}
              auraArea={auraArea}
              healthbarArea={healthbarArea}
              onStartMove={handleStartMoveMapObject}
              canStartMoving={toolButtonState === "select"}
              zoom={zoom}
              isSelected={selectedObjectIds.includes(object.id)}
              onSetHP={setHP}
              contrastColor={contrastColor}
            />
          );
        })}
      <g ref={setHealthbarArea} />
    </>
  );
});
