import React, { useContext } from "react";
import { RRPlayer } from "../shared/state";

export const MyselfContext = React.createContext<RRPlayer | null>(null);

MyselfContext.displayName = "MyselfContext";

export function useMyself(): RRPlayer {
  const myself = useContext(MyselfContext);

  if (!myself) {
    throw new Error("myself is not provided");
  }

  return myself;
}
