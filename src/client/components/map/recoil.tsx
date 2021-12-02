import {
  EphemeralPlayer,
  RRMapObject,
  RRMapObjectID,
  RRPlayerID,
  RRCharacter,
  RRCharacterID,
  EntityCollection,
  RRID,
  RRAssetID,
  RRAsset,
  RRPoint,
} from "../../../shared/state";
import {
  atomFamily,
  atom,
  RecoilState,
  useRecoilTransaction_UNSTABLE,
} from "recoil";
import { useLayoutEffect } from "react";
import { useServerState } from "../../state";
import React from "react";
import { measureTime } from "../../debug";

export const selectedMapObjectsFamily = atomFamily<boolean, RRMapObjectID>({
  key: "SelectedMapObject",
  default: false,
});

export const selectedMapObjectIdsAtom = atom<ReadonlyArray<RRMapObjectID>>({
  key: "SelectedMapObjectIds",
  default: [],
});

export const mapObjectGhostPositionsFamily = atomFamily<
  {
    position: RRPoint;
    fade: boolean;
  } | null,
  RRMapObjectID
>({
  key: "MapObjectGhostPosition",
  default: null,
});

export const highlightedCharactersFamily = atomFamily<boolean, RRCharacterID>({
  key: "HighlightedCharacter",
  default: false,
});

export const mapObjectsFamily = atomFamily<RRMapObject | null, RRMapObjectID>({
  key: "MapObject",
  default: null,
});

export const mapObjectIdsAtom = atom<ReadonlyArray<RRMapObjectID>>({
  key: "MapObjectIds",
  default: [],
});

export const characterFamily = atomFamily<RRCharacter | null, RRCharacterID>({
  key: "Character",
  default: null,
});

export const characterIdsAtom = atom<ReadonlyArray<RRCharacterID>>({
  key: "CharacterIds",
  default: [],
});

export const characterTemplateFamily = atomFamily<
  RRCharacter | null,
  RRCharacterID
>({
  key: "CharacterTemplate",
  default: null,
});

export const characterTemplateIdsAtom = atom<ReadonlyArray<RRCharacterID>>({
  key: "CharacterTemplateIds",
  default: [],
});

export const assetFamily = atomFamily<RRAsset | null, RRAssetID>({
  key: "Asset",
  default: null,
});

export const assetIdsAtom = atom<ReadonlyArray<RRAssetID>>({
  key: "AssetIds",
  default: [],
});

export const ephemeralPlayersFamily = atomFamily<
  EphemeralPlayer | null,
  RRPlayerID
>({
  key: "EphemeralPlayer",
  default: null,
});

export const ephemeralPlayerIdsAtom = atom<ReadonlyArray<RRPlayerID>>({
  key: "EphemeralPlayerIds",
  default: [],
});

function useReduxToRecoilBridge<E extends { id: RRID }>(
  debugIdentifier: string,
  entities: EntityCollection<E>,
  idsAtom: RecoilState<ReadonlyArray<E["id"]>>,
  familyAtom: (id: E["id"]) => RecoilState<E | null>
) {
  const updateRecoilObjects = useRecoilTransaction_UNSTABLE(
    ({ get, set, reset }) =>
      ({ ids: newIds, entities: newEntities }: EntityCollection<E>) => {
        const oldIds = get(idsAtom);
        if (oldIds !== newIds) {
          set(idsAtom, newIds);
        }

        newIds.forEach((newId) => {
          const atom = familyAtom(newId);
          const newEntity = newEntities[newId]!;
          const oldEntity = get(atom);
          if (!Object.is(newEntity, oldEntity)) {
            set(atom, newEntity);
          }
        });

        const newIdsSet = new Set(newIds);
        oldIds
          .filter((oldId) => !newIdsSet.has(oldId))
          .forEach((removedId) => reset(familyAtom(removedId)));
      },
    [familyAtom, idsAtom]
  );

  useLayoutEffect(() => {
    measureTime(`recoil-bridge/${debugIdentifier}`, () =>
      updateRecoilObjects(entities)
    );
  }, [debugIdentifier, entities, updateRecoilObjects]);
}

export const ReduxToRecoilBridge = React.memo(function ReduxToRecoilBridge({
  mapObjects,
}: {
  mapObjects: EntityCollection<RRMapObject>;
}) {
  useReduxToRecoilBridge(
    "map objects",
    mapObjects,
    mapObjectIdsAtom,
    mapObjectsFamily
  );
  useReduxToRecoilBridge(
    "characters",
    useServerState((s) => s.characters),
    characterIdsAtom,
    characterFamily
  );
  useReduxToRecoilBridge(
    "characterTemplates",
    useServerState((s) => s.characterTemplates),
    characterTemplateIdsAtom,
    characterTemplateFamily
  );
  useReduxToRecoilBridge(
    "assets",
    useServerState((s) => s.assets),
    assetIdsAtom,
    assetFamily
  );
  useReduxToRecoilBridge(
    "ephemeral players",
    useServerState((s) => s.ephemeral.players),
    ephemeralPlayerIdsAtom,
    ephemeralPlayersFamily
  );

  return null;
});
