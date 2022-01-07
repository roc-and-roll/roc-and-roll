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
import {
  MapObjectThatIsNotAToken,
  RRMouseEvent,
} from "./MapObjectThatIsNotAToken";
import { MapToken } from "./MapToken";

const HURT_SHADOW_BLUR_SIZE = 0.2;
// If this is too low, then the shadow is cut off inside a too small square.
const HURT_SHADOW_CLIPPING_PERCENTAGE = 50;

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
      primitiveUnits="objectBoundingBox"
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
      {/* <defs>
        {makeBlinkingCharacterFilter("tokenHurtShadow", "4s", "red")}
        {makeBlinkingCharacterFilter(
          "tokenUnconsciousOrDeadShadow",
          "0.4s",
          "red"
        )}
        {makeBlinkingCharacterFilter("tokenOverHealedShadow", "4s", "green")}
      </defs> */}
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
      // TODO z-index
      return (
        <MapObjectThatIsNotAToken
          mapId={mapId}
          object={mapObject}
          canStartMoving={canStartMoving}
          onStartMove={onStartMove}
        />
      );
    case "rectangle":
    case "ellipse":
    case "freehand":
    case "polygon":
    case "text":
      return (
        <MapObjectThatIsNotAToken
          mapId={mapId}
          object={mapObject}
          canStartMoving={canStartMoving}
          onStartMove={onStartMove}
        />
      );
    case "mapLink":
      return (
        <MapLink
          link={mapObject}
          canStartMoving={canStartMoving}
          onStartMove={onStartMove}
        />
      );
    case "token": {
      return (
        <MapToken
          mapId={mapId}
          object={mapObject}
          canStartMoving={canStartMoving}
          onStartMove={onStartMove}
          // additional parameters for tokens
          zoom={zoom}
          contrastColor={contrastColor}
          smartSetTotalHP={smartSetTotalHP}
        />
      );
    }
    default:
      assertNever(mapObject);
  }
});
