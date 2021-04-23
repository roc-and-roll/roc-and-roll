import React, { useContext } from "react";
import { RRPlayer } from "../shared/state";

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
