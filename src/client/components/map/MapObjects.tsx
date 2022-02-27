import React from "react";
import { useRecoilValue } from "recoil";
import {
  RRColor,
  RRMapObject,
  RRMapObjectID,
  RRCharacterID,
  RRMapID,
} from "../../../shared/state";
import { assertNever } from "../../../shared/util";
import { useMyProps } from "../../myself";
import { canViewObjectOnMap } from "../../permissions";
import { MapAreas } from "./Map";
import { ToolButtonState } from "./MapContainer";
import { mapObjectIdsAtom, mapObjectsFamily } from "./recoil";
import { MapLink } from "./MapLink";
import { MapObjectThatIsNotAToken } from "./MapObjectThatIsNotAToken";
import { createPixiPortal, RRMouseEvent } from "./pixi-utils";
import { MapToken } from "./MapToken";

export const MapObjects = React.memo<{
  areas: MapAreas;
  contrastColor: RRColor;
  toolButtonState: ToolButtonState;
  zoom: number;
  mapId: RRMapID;
  smartSetTotalHP: (characterId: RRCharacterID, hp: number) => void;
  handleStartMoveMapObject: (object: RRMapObject, event: RRMouseEvent) => void;
}>(function MapObjects({
  areas,
  contrastColor,
  toolButtonState,
  zoom,
  mapId,
  smartSetTotalHP,
  handleStartMoveMapObject,
}) {
  const mapObjectIds = useRecoilValue(mapObjectIdsAtom);
  const canStartMoving = toolButtonState === "select";

  return (
    <>
      {mapObjectIds.map((mapObjectId) => (
        <MapObjectWrapper
          key={mapObjectId}
          mapObjectId={mapObjectId}
          mapId={mapId}
          canStartMoving={canStartMoving}
          onStartMove={handleStartMoveMapObject}
          areas={areas}
          // additional parameters for tokens
          zoom={zoom}
          smartSetTotalHP={smartSetTotalHP}
          contrastColor={contrastColor}
        />
      ))}
    </>
  );
});

const MapObjectWrapper = React.memo<{
  mapObjectId: RRMapObjectID;
  canStartMoving: boolean;
  onStartMove: (object: RRMapObject, event: RRMouseEvent) => void;
  areas: MapAreas;
  // additional parameters for tokens
  zoom: number;
  contrastColor: string;
  mapId: RRMapID;
  smartSetTotalHP: (characterId: RRCharacterID, hp: number) => void;
}>(function MapObjectWrapper({
  mapObjectId,
  canStartMoving,
  onStartMove,
  areas,
  zoom,
  mapId,
  contrastColor,
  smartSetTotalHP,
}) {
  const mapObject = useRecoilValue(mapObjectsFamily(mapObjectId));
  const myself = useMyProps("id", "isGM");
  if (!mapObject || !canViewObjectOnMap(mapObject, myself.id, myself.isGM)) {
    return null;
  }

  switch (mapObject.type) {
    case "image":
      return createPixiPortal(
        <MapObjectThatIsNotAToken
          mapId={mapId}
          object={mapObject}
          canStartMoving={canStartMoving}
          onStartMove={onStartMove}
        />,
        areas.imageArea
      );
    case "rectangle":
    case "ellipse":
    case "freehand":
    case "polygon":
    case "text":
      return createPixiPortal(
        <MapObjectThatIsNotAToken
          mapId={mapId}
          object={mapObject}
          canStartMoving={canStartMoving}
          onStartMove={onStartMove}
        />,
        areas.defaultArea
      );
    case "mapLink":
      return createPixiPortal(
        <MapLink
          link={mapObject}
          canStartMoving={canStartMoving}
          onStartMove={onStartMove}
        />,
        areas.tokenArea
      );
    case "token": {
      return createPixiPortal(
        <MapToken
          mapId={mapId}
          object={mapObject}
          canStartMoving={canStartMoving}
          onStartMove={onStartMove}
          // additional parameters for tokens
          auraArea={areas.auraArea}
          healthBarArea={areas.healthBarArea}
          tooltipArea={areas.tooltipArea}
          zoom={zoom}
          contrastColor={contrastColor}
          smartSetTotalHP={smartSetTotalHP}
        />,
        areas.tokenArea
      );
    }
    default:
      assertNever(mapObject);
  }
});
