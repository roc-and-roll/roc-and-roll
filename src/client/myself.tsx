import React, { useContext, useEffect, useLayoutEffect, useState } from "react";
import { atom, useRecoilValue, useSetRecoilState } from "recoil";
import { IterableElement } from "type-fest";
import {
  RRCharacter,
  RRCharacterID,
  RRPlayer,
  RRPlayerID,
} from "../shared/state";
import { selectedMapObjectIdsAtom } from "./components/map/recoil";
import { useGuaranteedMemo } from "./useGuaranteedMemo";
import {
  useAutoDispatchPlayerIdOnChange,
  useServerState,
  useServerStateRef,
} from "./state";
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

export function useMySelectedCharacters<T extends (keyof RRCharacter)[]>(
  ...fields: T
): Pick<RRCharacter, IterableElement<T>>[] {
  const myself = useMyProps("currentMap");
  const stateRef = useServerStateRef((state) => state);

  const selectedMapObjectIds = useRecoilValue(selectedMapObjectIdsAtom);

  const [selectedCharacterIds, setSelectedCharacterIds] = useState<
    Set<RRCharacterID>
  >(() => new Set());

  useEffect(() => {
    const mapObjects =
      stateRef.current.maps.entities[myself.currentMap]?.objects;
    setSelectedCharacterIds(
      new Set(
        selectedMapObjectIds.flatMap((mapObjectId) => {
          const mapObject = mapObjects?.entities[mapObjectId];
          return mapObject?.type === "token" ? mapObject.characterId : [];
        })
      )
    );
  }, [myself.currentMap, selectedMapObjectIds, stateRef]);

  return useServerState(
    (state) =>
      [...selectedCharacterIds.values()].flatMap(
        (characterId) => state.characters.entities[characterId] ?? []
      ),
    (current, next) =>
      current.length === next.length &&
      current.every((each, i) => each.id === next[i]!.id) &&
      fields.every((field) =>
        current.every((each, i) => each[field] === next[i]![field])
      )
  );
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
