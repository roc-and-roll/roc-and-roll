import React, { createContext, useRef } from "react";
import { identity, Matrix } from "transformation-matrix";

export const MapTransformRef = createContext<{ current: Matrix }>({
  current: identity(),
});

export function MapTransformRefProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const mapTransformRef = useRef(identity());
  return (
    <MapTransformRef.Provider value={mapTransformRef}>
      {children}
    </MapTransformRef.Provider>
  );
}
