import React from "react";
import ReactDOM from "react-dom";
import { useRecoilValue } from "recoil";
import {
  RRColor,
  RRMapObject,
  RRMapObjectID,
  RRCharacterID,
  RRMapID,
} from "../../../shared/state";
import { assertNever } from "../../../shared/util";
import { useIsGM, useMyId } from "../../myself";
import { canViewObjectOnMap } from "../../permissions";
import { MapAreas } from "./Map";
import { ToolButtonState } from "./MapContainer";
import { mapObjectIdsAtom, mapObjectsFamily } from "./recoil";
import { MapLink } from "./MapLink";
import { MapObjectThatIsNotAToken } from "./MapObjectThatIsNotAToken";
import { MapToken } from "./MapToken";

const HURT_SHADOW_BLUR_SIZE = 8;
// If this is too low, then the shadow is cut off inside a too small square.
const HURT_SHADOW_CLIPPING_PERCENTAGE = 25;

function makeBlinkingCharacterFilter(
  name: string,
  duration: string,
  color: RRColor
) {
  return (
    <filter
      id={name}
      x={`-${HURT_SHADOW_CLIPPING_PERCENTAGE}%`}
      y={`-${HURT_SHADOW_CLIPPING_PERCENTAGE}%`}
      width={`${100 + 2 * HURT_SHADOW_CLIPPING_PERCENTAGE}%`}
      height={`${100 + 2 * HURT_SHADOW_CLIPPING_PERCENTAGE}%`}
    >
      <feDropShadow dx="0" dy="0" floodColor={color}>
        <animate
          attributeName="stdDeviation"
          calcMode="paced"
          begin="0s"
          dur={duration}
          values={`0;${HURT_SHADOW_BLUR_SIZE};0`}
          repeatCount="indefinite"
        />
      </feDropShadow>
    </filter>
  );
}

export const MapObjects = React.memo<{
  areas: MapAreas;
  contrastColor: RRColor;
  toolButtonState: ToolButtonState;
  zoom: number;
  mapId: RRMapID;
  smartSetTotalHP: (characterId: RRCharacterID, hp: number) => void;
  handleStartMoveMapObject: (
    object: RRMapObject,
    event: React.MouseEvent
  ) => void;
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
      <defs>
        {makeBlinkingCharacterFilter("tokenHurtShadow", "4s", "red")}
        {makeBlinkingCharacterFilter(
          "tokenUnconsciousOrDeadShadow",
          "0.4s",
          "red"
        )}
        {makeBlinkingCharacterFilter("tokenOverhealedShadow", "4s", "green")}
      </defs>
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
  onStartMove: (object: RRMapObject, event: React.MouseEvent) => void;
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
  const myId = useMyId();
  const isGM = useIsGM();
  if (!mapObject || !canViewObjectOnMap(mapObject, myId, isGM)) {
    return null;
  }

  switch (mapObject.type) {
    case "image":
      return ReactDOM.createPortal(
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
      return ReactDOM.createPortal(
        <MapObjectThatIsNotAToken
          mapId={mapId}
          object={mapObject}
          canStartMoving={canStartMoving}
          onStartMove={onStartMove}
        />,
        areas.defaultArea
      );
    case "mapLink":
      return ReactDOM.createPortal(
        <MapLink
          link={mapObject}
          canStartMoving={canStartMoving}
          onStartMove={onStartMove}
        />,
        areas.tokenArea
      );
    case "token": {
      return ReactDOM.createPortal(
        <MapToken
          mapId={mapId}
          object={mapObject}
          canStartMoving={canStartMoving}
          onStartMove={onStartMove}
          // additional parameters for tokens
          auraArea={areas.auraArea}
          healthbarArea={areas.healthbarArea}
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
