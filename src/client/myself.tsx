import React, { useContext } from "react";
import { IterableElement } from "type-fest";
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

export function MyselfProvider({ children }: { children: React.ReactNode }) {
  const [myPlayerId, setMyPlayerId, forgetMyPlayerId] =
    useLocalState<RRPlayerID | null>("myPlayerId", null);

  // Important: Use useMyProps everywhere else!
  const myself = useServerState(
    (state) => (myPlayerId && state.players.entities[myPlayerId]) ?? null
  );

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

export function useMyProps<T extends (keyof RRPlayer)[]>(
  ...fields: T
): Pick<RRPlayer, IterableElement<T>> {
  const myself = useContext(MyselfContext).player;
  if (!myself) throw new Error("myself is not provided");

  return useServerState(
    (state) => state.players.entities[myself.id]!,
    (left, right) => fields.every((field) => left[field] === right[field])
  );
}

export function useLoginLogout() {
  const {
    setMyPlayerId: login,
    forgetMyPlayerId: logout,
    player,
  } = useContext(MyselfContext);

  return { login, logout, loggedIn: !!player };
}
