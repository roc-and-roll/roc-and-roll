import React, { useContext } from "react";
import { RRMapObjectID } from "../shared/state";

type MapSelectionContextType = [
  RRMapObjectID[],
  React.Dispatch<React.SetStateAction<RRMapObjectID[]>>
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
