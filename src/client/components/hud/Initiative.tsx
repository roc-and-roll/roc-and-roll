import clsx from "clsx";
import React, {
  useContext,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import { Flipped, Flipper } from "react-flip-toolkit";
import { useRecoilCallback, useRecoilValue } from "recoil";
import {
  EMPTY_ENTITY_COLLECTION,
  EntityCollection,
  entries,
  InitiativeTrackerSyncedState,
  RRCharacter,
  RRCharacterID,
  RRInitiativeTrackerEntry,
  RRInitiativeTrackerEntryID,
  RRMapObject,
  RRMultipleRoll,
  RRPlayer,
  RRPlayerID,
  RRToken,
} from "../../../shared/state";
import {
  initiativeTrackerSetCurrentEntry,
  initiativeTrackerEntryRemove,
  initiativeTrackerEntryCharacterUpdate,
  initiativeTrackerEntryLairActionUpdate,
  initiativeTrackerEntryCharacterAdd,
  logEntryDiceRollAdd,
  initiativeTrackerEntryLairActionAdd,
} from "../../../shared/actions";
import { EMPTY_ARRAY, isCharacterDead } from "../../../shared/util";
import { useMyProps } from "../../myself";
import {
  useServerDispatch,
  useServerState,
  useServerStateRef,
} from "../../state";
import { useLatest } from "../../useLatest";
import { CharacterStack } from "../characters/CharacterPreview";
import {
  highlightedCharactersFamily,
  selectedMapObjectIdsAtom,
  selectedMapObjectsFamily,
} from "../map/recoil";
import { canControlToken } from "../../permissions";
import { Button } from "../ui/Button";
import { SmartIntegerInput } from "../ui/TextInput";
import {
  faArrowRight,
  faTrash,
  faDiceD20,
  faTimes,
  faHouseDamage,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { rollInitiative, diceResult } from "../../dice-rolling/roll";
import useLocalState from "../../useLocalState";
import { usePrompt } from "../../dialog-boxes";
import ReactDOM from "react-dom";
import { translate } from "transformation-matrix";
import { useRRSettings } from "../../settings";
import {
  SetTargetTransformContext,
  ViewPortSizeRefContext,
} from "../map/MapContainer";
import { makePoint, pointScale, pointSubtract } from "../../../shared/point";

function canEditEntry(
  entry: RRInitiativeTrackerEntry,
  myself: Pick<RRPlayer, "id" | "isGM" | "characterIds">,
  characterCollection: EntityCollection<RRCharacter>
) {
  if (entry.type === "lairAction") {
    return myself.isGM;
  }

  return entry.characterIds.some((characterId) => {
    const character = characterCollection.entities[characterId];
    return (
      character &&
      (canControlToken(character, { ...myself, isGM: false }) ||
        (myself.isGM && character.localToMap))
    );
  });
}

export function InitiativeHUD() {
  const myself = useMyProps(...myMapProps);
  const initiativeTracker = useServerState((state) => state.initiativeTracker);
  const characterCollection = useServerState((state) => state.characters);
  const playerCollection = useServerState((state) => state.players);
  const rows = entries(initiativeTracker.entries);

  const currentRowIndex = rows.findIndex(
    (row) => row.id === initiativeTracker.currentEntryId
  );
  const currentRow = currentRowIndex >= 0 ? rows[currentRowIndex] : undefined;

  const sortedRows =
    currentRowIndex >= 0
      ? [...rows.slice(currentRowIndex), ...rows.slice(0, currentRowIndex)]
      : rows;

  const canEdit =
    !!currentRow && canEditEntry(currentRow, myself, characterCollection);

  const dispatch = useServerDispatch();

  const mapObjectsRef = useServerStateRef(
    (state) =>
      state.maps.entities[myself.currentMap]?.objects ?? EMPTY_ENTITY_COLLECTION
  );
  const charactersRef = useServerStateRef((state) => state.characters);
  const viewPortSizeRef = useContext(ViewPortSizeRefContext);
  const setTargetTransform = useContext(SetTargetTransformContext);
  const setSelection = useRecoilCallback(
    ({ snapshot, set, reset }) =>
      (characterIds: RRCharacterID[]) => {
        const tokens: RRToken[] = characterIds.flatMap(
          (characterId) =>
            (entries(mapObjectsRef.current).find(
              (o) => o.type === "token" && o.characterId === characterId
            ) as RRToken | undefined) ?? []
        );
        const ids = tokens.map((t) => t.id);
        const currentIds = snapshot
          .getLoadable(selectedMapObjectIdsAtom)
          .getValue();
        if (
          (tokens.length > 0 && ids.length !== currentIds.length) ||
          ids.some((id) => !currentIds.includes(id))
        ) {
          if (canEdit) {
            snapshot
              .getLoadable(selectedMapObjectIdsAtom)
              .getValue()
              .forEach((id) => reset(selectedMapObjectsFamily(id)));
            set(selectedMapObjectIdsAtom, ids);
            ids.map((id) => set(selectedMapObjectsFamily(id), true));
          }
          const viewPortSize = viewPortSizeRef.current;
          const character =
            charactersRef.current.entities[tokens[0]!.characterId];
          if (
            character &&
            (character.visibility === "everyone" || myself.isGM)
          ) {
            const center = pointSubtract(
              pointSubtract(
                pointScale(viewPortSize, 0.5),
                makePoint((character.scale * TOKEN_SIZE) / 2)
              ),
              tokens[0]!.position
            );
            setTargetTransform(translate(center.x, center.y));
          }
        }
      },
    [
      mapObjectsRef,
      canEdit,
      viewPortSizeRef,
      charactersRef,
      setTargetTransform,
      myself,
    ]
  );

  const lastRowId = useRef<RRInitiativeTrackerEntryID | null>(null);

  const focusTokenOnTurnStart = useRRSettings()[0].focusTokenOnTurnStart;

  useEffect(() => {
    if (
      focusTokenOnTurnStart &&
      currentRow &&
      currentRow.id !== lastRowId.current &&
      currentRow.type === "character"
    ) {
      setSelection(currentRow.characterIds);
    }
    lastRowId.current = currentRow?.id ?? null;
  }, [currentRow, currentRowIndex, focusTokenOnTurnStart, setSelection]);

  function findNextRow() {
    if (currentRowIndex < 0) {
      return;
    }

    let rowIndex = (currentRowIndex + 1) % rows.length;
    while (rowIndex !== currentRowIndex) {
      const nextRow = rows[rowIndex]!;
      if (nextRow.type === "lairAction") {
        return nextRow;
      }

      if (
        nextRow.characterIds.some((characterId) => {
          const character = characterCollection.entities[characterId];
          return character && !isCharacterDead(character);
        })
      ) {
        return nextRow;
      }

      rowIndex = (rowIndex + 1) % rows.length;
    }
    return;
  }

  const endTurnButton = currentRow && (
    <EndTurnButton
      myself={myself}
      canEdit={canEdit}
      onClick={() => {
        const nextRow = findNextRow();
        if (!nextRow) {
          return;
        }
        dispatch(initiativeTrackerSetCurrentEntry(nextRow.id));
      }}
    />
  );

  return (
    <div className="absolute inset-2 h-24 pointer-events-none">
      <Flipper flipKey={sortedRows.map((row) => row.id).join("-")}>
        <ul role="list" className="inline-flex flex-wrap pointer-events-auto">
          <RollInitiative
            isGM={myself.isGM}
            clearInitiative={() =>
              dispatch(
                rows.map((entry) => initiativeTrackerEntryRemove(entry.id))
              )
            }
            initiativeTracker={initiativeTracker}
            characterCollection={characterCollection}
            myselfId={myself.id}
          />
          {sortedRows.map((entry, idx) => (
            <InitiativeEntry
              key={entry.id}
              inverseIdx={sortedRows.length - idx - 1}
              entry={entry}
              isCurrentEntry={entry.id === initiativeTracker.currentEntryId}
              characterCollection={characterCollection}
              playerCollection={playerCollection}
              myself={myself}
            />
          ))}
        </ul>
      </Flipper>
      {canEdit && <YourTurn endTurnButton={endTurnButton} />}
    </div>
  );
}

function EndTurnButton({
  canEdit,
  myself,
  onClick,
}: {
  canEdit: boolean;
  myself: RRPlayerMapProps;
  onClick: () => void;
}) {
  return (
    <Button
      className={clsx(
        "initiative-tracker-turn-done",
        "pointer-events-auto",
        "absolute",
        "top-0",
        "z-30",
        "left-1/2",
        "w-64",
        "-ml-32",
        {
          "gm-button": !canEdit && myself.isGM,
        }
      )}
      disabled={!(canEdit || myself.isGM)}
      onClick={onClick}
    >
      I am done with my turn!
    </Button>
  );
}

function YourTurn({ endTurnButton }: { endTurnButton: React.ReactNode }) {
  return ReactDOM.createPortal(
    <>
      <div className="absolute inset-0 h-full w-full opacity-70 border-rr-500 border animate-border-wiggle pointer-events-none flex justify-center items-start z-20 your-turn-border"></div>
      {endTurnButton}
    </>,
    document.body
  );
}

const TOKEN_SIZE = 64;
const myMapProps = ["id", "isGM", "currentMap", "characterIds"] as const;
type RRPlayerMapProps = Pick<RRPlayer, typeof myMapProps[number]>;

const InitiativeEntry = React.memo<{
  entry: RRInitiativeTrackerEntry;
  characterCollection: EntityCollection<RRCharacter>;
  playerCollection: EntityCollection<RRPlayer>;
  isCurrentEntry: boolean;
  myself: RRPlayerMapProps;
  inverseIdx: number;
}>(function InitiativeEntry({
  entry,
  characterCollection,
  playerCollection,
  isCurrentEntry,
  myself,
  inverseIdx,
}) {
  const dispatch = useServerDispatch();
  const onSetCurrentEntry = () =>
    dispatch(initiativeTrackerSetCurrentEntry(entry.id));

  const onRemoveEntry = () => dispatch(initiativeTrackerEntryRemove(entry.id));

  let content = null;
  let label = "";
  const [hovered, setHovered] = useState(false);
  const [focus, setFocus] = useState(false);
  if (entry.type === "lairAction") {
    label = entry.description;
    content = (
      <>
        <div
          style={{
            width: TOKEN_SIZE,
            height: TOKEN_SIZE,
          }}
          className="bg-black rounded-full color-white grid place-items-center font-bold"
        >
          <FontAwesomeIcon icon={faHouseDamage} />
        </div>
      </>
    );
  } else {
    const characters = entry.characterIds
      .map((id) => characterCollection.entities[id])
      // Sort dead characters to the back of the token stack.
      .sort(
        (a, b) =>
          +(b ? isCharacterDead(b) : true) - +(a ? isCharacterDead(a) : true)
      );
    const names = new Set(
      characters.map((character) => character?.name ?? "Unknown Character")
    );
    label = [...names].join(", ");
    content = (
      <>
        <CharacterStack
          characters={characters.flatMap((character) => character ?? [])}
          size={TOKEN_SIZE}
        />
      </>
    );
  }

  const active = hovered || focus;

  const canEdit = canEditEntry(entry, myself, characterCollection);

  const characterIds =
    entry.type === "character" ? entry.characterIds : EMPTY_ARRAY;
  const characterIdsRef = useLatest(characterIds);

  const onHover = useRecoilCallback(
    ({ set, reset }) =>
      (hovered: boolean) => {
        setHovered(hovered);
        characterIdsRef.current.forEach((characterId) => {
          if (hovered) {
            set(highlightedCharactersFamily(characterId), true);
          } else {
            reset(highlightedCharactersFamily(characterId));
          }
        });
      },
    // The useEffect below assumes that this callback never changes, therefore
    // all dependencies must be refs.
    [characterIdsRef]
  );

  useEffect(() => {
    // If the user clicks the "remove" button, we never get the onMouseLeave
    // event. Therefore we additionally trigger the onMouseLeave handler when
    // this component is unmounted.
    return () => onHover(false);
  }, [onHover]);

  return (
    <Flipped
      flipId={entry.id}
      onStart={(element) => (element.style.zIndex = inverseIdx.toString())}
      onComplete={(element) => (element.style.zIndex = "")}
    >
      <li
        key={entry.id}
        className={clsx("flex-shrink-0", "m-1", "relative")}
        onMouseOver={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
      >
        {content}
        {(canEdit || myself.isGM) && active && (
          <Button
            small
            onClick={() => onRemoveEntry()}
            className={clsx(
              !canEdit && myself.isGM && "gm-button",
              "absolute",
              "-top-2",
              "-right-2",
              "z-30"
            )}
          >
            <FontAwesomeIcon size="xs" icon={faTimes} />
          </Button>
        )}
        {active && myself.isGM && (
          <Button
            small
            className="gm-button absolute -top-2 -left-2 z-30"
            title="Jump to this player"
            onClick={() => onSetCurrentEntry()}
          >
            <FontAwesomeIcon size="xs" icon={faArrowRight} />
          </Button>
        )}
        {active && (
          <div
            className={clsx(
              "absolute z-20 h-full w-full inset-0 grid place-items-center",
              !(canEdit || myself.isGM) && "pointer-events-none"
            )}
          >
            {canEdit || myself.isGM ? (
              <SmartIntegerInput
                className="w-10"
                value={entry.initiative}
                onFocus={() => setFocus(true)}
                onBlur={() => setFocus(false)}
                onChange={(initiative) =>
                  dispatch(
                    (entry.type === "character"
                      ? initiativeTrackerEntryCharacterUpdate
                      : initiativeTrackerEntryLairActionUpdate)({
                      id: entry.id,
                      changes: { initiative },
                    })
                  )
                }
              />
            ) : (
              <p className="font-bold text-xl">{entry.initiative}</p>
            )}
          </div>
        )}
        {active && (
          <div className="absolute -bottom-6 text-center pointer-events-none w-full font-bold">
            {label}
          </div>
        )}
      </li>
    </Flipped>
  );
});

function RollInitiative({
  initiativeTracker,
  characterCollection,
  myselfId,
  clearInitiative,
  isGM,
}: {
  initiativeTracker: InitiativeTrackerSyncedState;
  characterCollection: EntityCollection<RRCharacter>;
  myselfId: RRPlayerID;
  clearInitiative: () => void;
  isGM: boolean;
}) {
  const myself = useMyProps(...myMapProps);
  // Avoid re-rendering the RollInitiative component repeatedly when people are
  // moving map objects around the map.
  const upToDateMapObjects = useServerState(
    (state) =>
      state.maps.entities[myself.currentMap]?.objects ?? EMPTY_ENTITY_COLLECTION
  );
  const deferredMapObjects = useDeferredValue(upToDateMapObjects);

  return (
    <RollInitiativeDeferredImpl
      initiativeTracker={initiativeTracker}
      characterCollection={characterCollection}
      myselfId={myselfId}
      mapObjects={deferredMapObjects}
      mapObjectsOutdated={upToDateMapObjects !== deferredMapObjects}
      clearInitiative={clearInitiative}
      isGM={isGM}
    />
  );
}

const RollInitiativeDeferredImpl = React.memo<{
  initiativeTracker: InitiativeTrackerSyncedState;
  isGM: boolean;
  characterCollection: EntityCollection<RRCharacter>;
  myselfId: RRPlayerID;
  mapObjects: EntityCollection<RRMapObject>;
  mapObjectsOutdated: boolean;
  clearInitiative: () => void;
}>(function RollInitiativeDeferredImpl({
  initiativeTracker,
  characterCollection,
  myselfId,
  isGM,
  mapObjects,
  mapObjectsOutdated,
  clearInitiative,
}) {
  const dispatch = useServerDispatch();
  const prompt = usePrompt();

  const [modifier, setModifier, _] = useLocalState("initiative-modifier", "0");

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

  const characterIdsInTracker = entries(initiativeTracker.entries).flatMap(
    (entry) => (entry.type === "character" ? entry.characterIds : [])
  );

  const selectionAlreadyInList = characterIdsInTracker.some((id) =>
    selectedCharacterIds.includes(id)
  );

  const hasSelection = selectedCharacterIds.length !== 0;

  const selectedCharacters = selectedCharacterIds.flatMap(
    (characterId) => characterCollection.entities[characterId] ?? []
  );

  const allSelectedInitiatives = [
    ...new Set(
      selectedCharacters.map((c) => c.attributes["initiative"] ?? null)
    ),
  ];

  const allHaveSameInitiative =
    allSelectedInitiatives.length === 1 && allSelectedInitiatives[0] !== null;

  const addLairAction = async () => {
    const description = await prompt(
      'How should we name this lair action in the initiative tracker ("Lair Action" works fine)?',
      "Lair Action"
    );
    if (!description) {
      return;
    }
    const initiativeStr = await prompt("Enter the initiative value", "20");
    if (!initiativeStr) {
      return;
    }
    const initiative = parseInt(initiativeStr);
    if (isNaN(initiative)) {
      return;
    }

    dispatch(
      initiativeTrackerEntryLairActionAdd({
        initiative,
        description,
      })
    );
  };

  const roll = (modified: RRMultipleRoll) => {
    const mod = allHaveSameInitiative
      ? allSelectedInitiatives[0]!
      : parseInt(modifier);
    const action = logEntryDiceRollAdd(
      rollInitiative(isNaN(mod) ? 0 : mod, modified, myselfId)
    );
    dispatch([
      action,
      initiativeTrackerEntryCharacterAdd({
        initiative: diceResult(action.payload.payload.diceRollTree),
        characterIds: selectedCharacterIds,
      }),
    ]);
  };

  return (
    <div className="flex m-1 items-center">
      {!selectionAlreadyInList && hasSelection && (
        <div className="flex">
          <Button
            style={{ width: TOKEN_SIZE, height: TOKEN_SIZE }}
            className="rounded-full"
            title="Roll initiative"
            disabled={mapObjectsOutdated}
            onClick={() => roll("none")}
          >
            <FontAwesomeIcon icon={faDiceD20} />
          </Button>
          <div className="flex flex-col mx-2 justify-center">
            <div className="flex flex-row">
              <Button
                className="p-0 w-8"
                disabled={mapObjectsOutdated}
                onClick={() => roll("advantage")}
              >
                Adv
              </Button>
              <Button
                className="p-0 w-8"
                disabled={mapObjectsOutdated}
                onClick={() => roll("disadvantage")}
              >
                Dis
              </Button>
            </div>
            <input
              className="w-16 text-center"
              value={
                allHaveSameInitiative ? allSelectedInitiatives[0]! : modifier
              }
              disabled={allHaveSameInitiative || mapObjectsOutdated}
              onChange={(e) => setModifier(e.target.value)}
              placeholder="mod"
              title={
                allHaveSameInitiative
                  ? `Using configured Modifier ${
                      allSelectedInitiatives[0] ?? ""
                    }`
                  : "Modifier"
              }
            />
          </div>
        </div>
      )}
      {isGM && (
        <div className="flex flex-col w-12 ml-2">
          <Button onClick={clearInitiative} title="Clear Initiative">
            <FontAwesomeIcon icon={faTrash} />
          </Button>
          <Button onClick={addLairAction} title="Add lair action">
            <FontAwesomeIcon icon={faHouseDamage} />
          </Button>
        </div>
      )}
    </div>
  );
});
