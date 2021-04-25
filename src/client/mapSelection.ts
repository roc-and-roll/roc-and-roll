import React, { useContext } from "react";
import { RRTokenOnMapID } from "../shared/state";

type MapSelectionContextType = [
  RRTokenOnMapID[],
  React.Dispatch<React.SetStateAction<RRTokenOnMapID[]>>
];

export const MapSelectionContext = React.createContext<MapSelectionContextType>(
  [[], (_) => {}]
);

MapSelectionContext.displayName = "MapSelectionContext";

export function useMapSelection(allowNull?: false): MapSelectionContextType;

export function useMapSelection(allowNull = false): MapSelectionContextType {
  const mapSelection = useContext(MapSelectionContext);

  if (!mapSelection && !allowNull) {
    throw new Error("myself is not provided");
  }

  return mapSelection;
}
