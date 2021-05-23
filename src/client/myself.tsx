import React, { useContext, useEffect, useMemo } from "react";
import { useRecoilValue } from "recoil";
import { useRecoilState } from "recoil";
import { useSetRecoilState } from "recoil";
import { atom } from "recoil";
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

export const myIdAtom = atom<RRPlayerID | null>({
  key: "MyId",
  default: null,
});

export const isGMAtom = atom<boolean>({
  key: "isGM",
  default: false,
});

export function useMyId() {
  const id = useRecoilValue(myIdAtom);
  if (!id) {
    throw new Error("unset player");
  }
  return id;
}

export function useIsGM() {
  return useRecoilValue(isGMAtom);
}

export function MyselfProvider({ children }: { children: React.ReactNode }) {
  const players = useServerState((state) => state.players);
  const [
    myPlayerId,
    setMyPlayerId,
    forgetMyPlayerId,
  ] = useLocalState<RRPlayerID | null>("myPlayerId", null);

  // Important: Use useMyself everywhere else!
  const myself = myPlayerId ? byId(players.entities, myPlayerId) ?? null : null;

  const setId = useSetRecoilState(myIdAtom);
  useEffect(() => {
    if (myPlayerId !== null) setId(myPlayerId);
  }, [myPlayerId, setId]);

  const setIsGM = useSetRecoilState(isGMAtom);
  useEffect(() => {
    setIsGM(myself?.isGM ?? false);
  }, [myself?.isGM, setIsGM]);

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
