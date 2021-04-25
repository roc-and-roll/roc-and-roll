import React, { useContext } from "react";
import { byId, RRMap, RRPlayer } from "../shared/state";
import { useServerState } from "./state";

export const MyselfContext = React.createContext<RRPlayer | null>(null);

MyselfContext.displayName = "MyselfContext";

export function useMyself(allowNull?: false): RRPlayer;

export function useMyself(allowNull = false): RRPlayer | null {
  const myself = useContext(MyselfContext);

  if (!myself && !allowNull) {
    throw new Error("myself is not provided");
  }

  return myself;
}

export function useMyMap<T>(selector: (map: RRMap | undefined) => T) {
  const myself = useMyself();
  const currentMap = useServerState((state) =>
    selector(byId(state.maps.entities, myself.currentMap))
  );

  return currentMap;
}
