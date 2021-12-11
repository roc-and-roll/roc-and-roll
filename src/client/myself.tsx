import React, { useContext, useLayoutEffect } from "react";
import { atom, useRecoilValue, useSetRecoilState } from "recoil";
import { IterableElement } from "type-fest";
import {
  EMPTY_ENTITY_COLLECTION,
  RRPlayer,
  RRPlayerID,
  entries,
} from "../shared/state";
import { selectedMapObjectIdsAtom } from "./components/map/recoil";
import { useAutoDispatchPlayerIdOnChange, useServerState } from "./state";
import { useGuaranteedMemo } from "./useGuaranteedMemo";
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

  //This is needed, otherwise recoil will refuse to work in strict mode for unknown reasons
  const setPlayerId = useSetRecoilState(myPlayerIdAtom);
  useLayoutEffect(() => {
    setPlayerId(myPlayerId);
  }, [myPlayerId, setPlayerId]);

  useAutoDispatchPlayerIdOnChange(myself?.id ?? null);

  const ctx = useGuaranteedMemo(
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

export function useMySelectedTokens() {
  const myself = useMyProps("currentMap");

  const characterCollection = useServerState((state) => state.characters);
  const mapObjects = useServerState(
    (state) =>
      state.maps.entities[myself.currentMap]?.objects ??
      EMPTY_ENTITY_COLLECTION,
    (current, next) => {
      const cl = entries(current);
      const nl = entries(next);
      return cl === nl && cl.every((c, i) => c.id === nl[i]!.id);
    }
  );

  const selectedMapObjectIds = useRecoilValue(selectedMapObjectIdsAtom).filter(
    Boolean
  );

  const selectedCharacterIds = [
    ...new Set(
      selectedMapObjectIds.flatMap((mapObjectId) => {
        const mapObject = mapObjects.entities[mapObjectId];
        return mapObject?.type === "token" ? mapObject.characterId : [];
      })
    ),
  ];

  const selectedCharacters = selectedCharacterIds.flatMap(
    (characterId) => characterCollection.entities[characterId] ?? []
  );

  return selectedCharacters;
}

export function useMyProps<T extends (keyof RRPlayer)[]>(
  ...fields: T
): Pick<RRPlayer, IterableElement<T>> {
  const myId = useContext(MyselfContext).playerId;
  if (!myId) throw new Error("myself is not provided");

  return useServerState(
    (state) => state.players.entities[myId]!,
    (current, next) => fields.every((field) => current[field] === next[field])
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
