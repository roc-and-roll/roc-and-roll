import React, { useContext, useLayoutEffect } from "react";
import { useRecoilValue } from "recoil";
import { useSetRecoilState } from "recoil";
import { atom } from "recoil";
import { RRPlayer, RRPlayerID } from "../shared/state";
import { useAutoDispatchPlayerIdOnChange, useServerState } from "./state";
import { useGuranteedMemo } from "./useGuranteedMemo";
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
  const [myPlayerId, setMyPlayerId, forgetMyPlayerId] =
    useLocalState<RRPlayerID | null>("myPlayerId", null);

  // Important: Use useMyself everywhere else!
  const myself = useServerState(
    (state) => (myPlayerId && state.players.entities[myPlayerId]) ?? null
  );

  const setId = useSetRecoilState(myIdAtom);
  useLayoutEffect(() => {
    setId(myPlayerId);
  }, [myPlayerId, setId]);

  const setIsGM = useSetRecoilState(isGMAtom);
  useLayoutEffect(() => {
    setIsGM(myself?.isGM ?? false);
  }, [myself?.isGM, setIsGM]);

  useAutoDispatchPlayerIdOnChange(myself?.id ?? null);

  const ctx = useGuranteedMemo(
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

export function useLoginLogout() {
  const {
    setMyPlayerId: login,
    forgetMyPlayerId: logout,
    player,
  } = useContext(MyselfContext);

  return { login, logout, loggedIn: !!player };
}
