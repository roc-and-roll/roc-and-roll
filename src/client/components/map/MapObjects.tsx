import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom";
import { useRecoilValue } from "recoil";
import {
  RRColor,
  RRMapObject,
  RRMapObjectID,
  RRCharacterID,
} from "../../../shared/state";
import { assertNever } from "../../../shared/util";
import {
  mapObjectIdsAtom,
  mapObjectsFamily,
  ToolButtonState,
} from "./MapContainer";
import { MapObjectThatIsNotAToken } from "./MapObjectThatIsNotAToken";
import { MapToken } from "./MapToken";

export const MapObjects = React.memo<{
  contrastColor: RRColor;
  toolButtonState: ToolButtonState;
  zoom: number;
  setHP: (tokenId: RRCharacterID, hp: number) => void;
  handleStartMoveMapObject: (
    object: RRMapObject,
    event: React.MouseEvent
  ) => void;
}>(function MapObjects({
  contrastColor,
  toolButtonState,
  zoom,
  setHP,
  handleStartMoveMapObject,
}) {
  const mapObjectIds = useRecoilValue(mapObjectIdsAtom);
  const canStartMoving = toolButtonState === "select";

  const [imageArea, setImageArea] = useState<SVGGElement | null>(null);
  const [auraArea, setAuraArea] = useState<SVGGElement | null>(null);
  const [defaultArea, setDefaultArea] = useState<SVGGElement | null>(null);
  const [tokenArea, setTokenArea] = useState<SVGGElement | null>(null);
  const [healthbarArea, setHealthbarArea] = useState<SVGGElement | null>(null);

  const areas = useMemo(
    () =>
      imageArea && auraArea && defaultArea && tokenArea && healthbarArea
        ? {
            imageArea: imageArea,
            auraArea: auraArea,
            defaultArea: defaultArea,
            tokenArea: tokenArea,
            healthbarArea: healthbarArea,
          }
        : null,
    [imageArea, auraArea, defaultArea, tokenArea, healthbarArea]
  );

  return (
    <>
      {areas &&
        mapObjectIds.map((mapObjectId) => (
          <MapObjectWrapper
            key={mapObjectId}
            mapObjectId={mapObjectId}
            canStartMoving={canStartMoving}
            onStartMove={handleStartMoveMapObject}
            areas={areas}
            // additional parameters for tokens
            zoom={zoom}
            setHP={setHP}
            contrastColor={contrastColor}
          />
        ))}
      <g ref={setImageArea} />
      <g ref={setAuraArea} />
      <g ref={setDefaultArea} />
      <g ref={setTokenArea} />
      <g ref={setHealthbarArea} />
    </>
  );
});

const MapObjectWrapper = React.memo<{
  mapObjectId: RRMapObjectID;
  canStartMoving: boolean;
  onStartMove: (object: RRMapObject, event: React.MouseEvent) => void;
  areas: {
    imageArea: SVGGElement;
    auraArea: SVGGElement;
    defaultArea: SVGGElement;
    tokenArea: SVGGElement;
    healthbarArea: SVGGElement;
  };
  // additional parameters for tokens
  zoom: number;
  contrastColor: string;
  setHP: (tokenId: RRCharacterID, hp: number) => void;
}>(function MapObjectWrapper({
  mapObjectId,
  canStartMoving,
  onStartMove,
  areas,
  zoom,
  contrastColor,
  setHP,
}) {
  const mapObject = useRecoilValue(mapObjectsFamily(mapObjectId));
  if (!mapObject) {
    return null;
  }

  switch (mapObject.type) {
    case "image":
      return ReactDOM.createPortal(
        <MapObjectThatIsNotAToken
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
          object={mapObject}
          canStartMoving={canStartMoving}
          onStartMove={onStartMove}
        />,
        areas.defaultArea
      );
    case "token": {
      return ReactDOM.createPortal(
        <MapToken
          object={mapObject}
          canStartMoving={canStartMoving}
          onStartMove={onStartMove}
          // additional parameters for tokens
          auraArea={areas.auraArea}
          healthbarArea={areas.healthbarArea}
          zoom={zoom}
          contrastColor={contrastColor}
          setHP={setHP}
        />,
        areas.tokenArea
      );
    }
    default:
      assertNever(mapObject);
  }
});
