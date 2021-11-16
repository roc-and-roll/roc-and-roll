import React, { useContext, useLayoutEffect } from "react";
import { atom, useSetRecoilState } from "recoil";
import { IterableElement } from "type-fest";
import { RRPlayer, RRPlayerID } from "../shared/state";
import { useAutoDispatchPlayerIdOnChange, useServerState } from "./state";
import { useGuranteedMemo } from "./useGuranteedMemo";
import useLocalState from "./useLocalState";

const MyselfContext = React.createContext<{
  playerId: RRPlayerID | null;
  setMyPlayerId: (id: RRPlayerID) => void;
  forgetMyPlayerId: () => void;
}>({
  playerId: null,
  setMyPlayerId: () => {},
  forgetMyPlayerId: () => {},
});

MyselfContext.displayName = "MyselfContext";
const myPlayerIdAtom = atom<RRPlayerID | null>({
  key: "MyPlayerId",
  default: null,
});

export function MyselfProvider({ children }: { children: React.ReactNode }) {
  const [myPlayerId, setMyPlayerId, forgetMyPlayerId] =
    useLocalState<RRPlayerID | null>("myPlayerId", null);

  // Important: Use useMyProps everywhere else!
  const myself = useServerState(
    (state) => (myPlayerId && state.players.entities[myPlayerId]) ?? null
  );

  //This is needed, otherwise recoil will refuse to work in strict mode for unkown reasons
  const setPlayerId = useSetRecoilState(myPlayerIdAtom);
  useLayoutEffect(() => {
    setPlayerId(myPlayerId);
  }, [myPlayerId, setPlayerId]);

  useAutoDispatchPlayerIdOnChange(myself?.id ?? null);

  const ctx = useGuranteedMemo(
    () => ({
      playerId: myself?.id ?? null,
      setMyPlayerId,
      forgetMyPlayerId,
    }),
    [myself?.id, setMyPlayerId, forgetMyPlayerId]
  );

  return (
    <MyselfContext.Provider value={ctx}>{children}</MyselfContext.Provider>
  );
}

export function useMyProps<T extends (keyof RRPlayer)[]>(
  ...fields: T
): Pick<RRPlayer, IterableElement<T>> {
  const myId = useContext(MyselfContext).playerId;
  if (!myId) throw new Error("myself is not provided");

  return useServerState(
    (state) => state.players.entities[myId]!,
    (left, right) => fields.every((field) => left[field] === right[field])
  );
}

export function useLoginLogout() {
  const {
    setMyPlayerId: login,
    forgetMyPlayerId: logout,
    playerId,
  } = useContext(MyselfContext);

  return { login, logout, loggedIn: !!playerId };
}
