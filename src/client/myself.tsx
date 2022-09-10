import React, { useContext, useMemo } from "react";
import { useRecoilValue } from "recoil";
import { IterableElement } from "type-fest";
import { RRCharacter, RRPlayer, RRPlayerID } from "../shared/state";
import { selectedMapObjectIdsAtom } from "./components/map/recoil";
import { useGuaranteedMemo } from "./useGuaranteedMemo";
import {
  useAutoDispatchPlayerIdOnChange,
  useServerState,
  useServerStateRef,
} from "./state";
import useLocalState from "./useLocalState";

export const MyselfContext = React.createContext<{
  playerId: RRPlayerID | null;
  setMyPlayerId: (id: RRPlayerID) => void;
  forgetMyPlayerId: () => void;
}>({
  playerId: null,
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

export function useMyActiveCharacters<T extends (keyof RRCharacter)[]>(
  ...fields: T
): [] extends T ? RRCharacter[] : Pick<RRCharacter, IterableElement<T>>[] {
  const selectedCharacters = useMySelectedCharacters(...fields);
  const mainCharacter = useMyMainCharacter(...fields);

  return selectedCharacters.length > 0
    ? selectedCharacters
    : mainCharacter !== null
    ? [mainCharacter]
    : ([] as any); //TODO
}

function useMyMainCharacter<T extends (keyof RRCharacter)[]>(
  ...fields: T
): [] extends T
  ? RRCharacter | null
  : Pick<RRCharacter, IterableElement<T>> | null {
  const myself = useMyProps("mainCharacterId");
  return useServerState(
    (s) =>
      myself.mainCharacterId
        ? s.characters.entities[myself.mainCharacterId] ?? null
        : null,
    fields.length === 0
      ? Object.is
      : (current, next) =>
          fields.every((field) => Object.is(current?.[field], next?.[field]))
  );
}

export function useMySelectedCharacters<T extends (keyof RRCharacter)[]>(
  ...fields: T
): [] extends T ? RRCharacter[] : Pick<RRCharacter, IterableElement<T>>[] {
  const myself = useMyProps("currentMap");
  const stateRef = useServerStateRef((state) => state);

  const selectedMapObjectIds = useRecoilValue(selectedMapObjectIdsAtom);

  const selectedCharacterIds = useMemo(() => {
    const mapObjects =
      myself.currentMap &&
      stateRef.current.maps.entities[myself.currentMap]?.objects;
    return [
      ...new Set(
        selectedMapObjectIds.flatMap((mapObjectId) => {
          const mapObject = mapObjects?.entities[mapObjectId];
          return mapObject?.type === "token" ? mapObject.characterId : [];
        })
      ).values(),
    ];
  }, [myself.currentMap, selectedMapObjectIds, stateRef]);

  return useServerState(
    (state) =>
      selectedCharacterIds.flatMap(
        (characterId) => state.characters.entities[characterId] ?? []
      ),
    fields.length === 0
      ? (current, next) =>
          current.length === next.length &&
          current.every((each, i) => Object.is(each, next[i]))
      : (current, next) =>
          current.length === next.length &&
          current.every((each, i) => each.id === next[i]!.id) &&
          fields.every((field) =>
            current.every((each, i) => Object.is(each[field], next[i]![field]))
          )
  );
}

// Returns the currently selected characters, or, if none are selected, an array
// with just the main character of the player.
export function useMySelectedCharactersOrMainCharacter<
  T extends (keyof RRCharacter)[]
>(
  ...fields: T
): [] extends T ? RRCharacter[] : Pick<RRCharacter, IterableElement<T>>[] {
  const selectedCharacters = useMySelectedCharacters(...fields);
  const mainCharacter = useMyMainCharacter(...fields);
  return selectedCharacters.length > 0
    ? selectedCharacters
    : mainCharacter
    ? ([mainCharacter] as [] extends T
        ? RRCharacter[]
        : Pick<RRCharacter, IterableElement<T>>[])
    : [];
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
