import React, { useContext, useMemo } from "react";
import { byId, RRMap, RRPlayer, RRPlayerID } from "../shared/state";
import { useAutoDispatchPlayerIdOnChange, useServerState } from "./state";
import useLocalState from "./useLocalState";

const MyselfContext = React.createContext<{
  player: RRPlayer | null;
  setMyPlayerId: (id: RRPlayerID) => void;
  forgetMyPlayerId: () => void;
}>({
  player: null,
  setMyPlayerId: () => {},
  forgetMyPlayerId: () => {},
});

MyselfContext.displayName = "MyselfContext";

export function MyselfProvider({ children }: { children: React.ReactNode }) {
  const players = useServerState((state) => state.players);
  const [
    myPlayerId,
    setMyPlayerId,
    forgetMyPlayerId,
  ] = useLocalState<RRPlayerID | null>("myPlayerId", null);

  // Important: Use useMyself everywhere else!
  const myself = myPlayerId ? byId(players.entities, myPlayerId) ?? null : null;

  useAutoDispatchPlayerIdOnChange(myself?.id ?? null);

  const ctx = useMemo(
    () => ({
      player: myself,
      setMyPlayerId,
      forgetMyPlayerId,
    }),
    [myself, setMyPlayerId, forgetMyPlayerId]
  );

  return (
    <MyselfContext.Provider value={ctx}>{children}</MyselfContext.Provider>
  );
}

export function useMyself(allowNull?: false): RRPlayer;

export function useMyself(allowNull = false): RRPlayer | null {
  const myself = useContext(MyselfContext).player;

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

export function useLoginLogout() {
  const { setMyPlayerId: login, forgetMyPlayerId: logout, player } = useContext(
    MyselfContext
  );

  return { login, logout, loggedIn: !!player };
}
