import clsx from "clsx";
import React, { useContext, useEffect, useDeferredValue } from "react";
import {
  initiativeTrackerEntryLairActionAdd,
  initiativeTrackerEntryLairActionUpdate,
  initiativeTrackerEntryRemove,
  initiativeTrackerEntryCharacterAdd,
  initiativeTrackerEntryCharacterUpdate,
  initiativeTrackerSetCurrentEntry,
  logEntryDiceRollAdd,
  initiativeTrackerSetVisible,
} from "../../shared/actions";
import {
  entries,
  RRInitiativeTrackerEntry,
  RRPlayer,
  EMPTY_ENTITY_COLLECTION,
  EntityCollection,
  RRCharacter,
  InitiativeTrackerSyncedState,
  RRPlayerID,
  RRMapObject,
  RRMultipleRoll,
} from "../../shared/state";
import { useMyProps } from "../myself";
import { canControlToken } from "../permissions";
import { diceResult, rollInitiative } from "../roll";
import { useServerDispatch, useServerState } from "../state";
import { useLatest } from "../useLatest";
import useLocalState from "../useLocalState";
import { GMArea } from "./GMArea";
import { CharacterStack } from "./characters/CharacterPreview";
import { Button } from "./ui/Button";
import { Flipper, Flipped } from "react-flip-toolkit";
import { useRecoilCallback, useRecoilValue } from "recoil";
import {
  highlightedCharactersFamily,
  selectedMapObjectIdsAtom,
} from "./map/recoil";
import { EMPTY_ARRAY, isCharacterDead } from "../../shared/util";
import ReactDOM from "react-dom";
import { SmartIntegerInput } from "./ui/TextInput";
import { usePrompt } from "../dialog-boxes";
import { NotificationAreaPortal } from "./Notifications";

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

  let entryContainsPlayerCharacter = false;
  let content = null;
  if (entry.type === "lairAction") {
    content = (
      <>
        {/* Add an empty CharacterStack for correct padding */}
        <CharacterStack characters={[]} />
        <p className="vertically-centered-text">{entry.description}</p>
      </>
    );
  } else {
    const characters = entry.characterIds.map(
      (id) => characterCollection.entities[id]
    );
    const names = new Set(
      characters.map((character) => character?.name ?? "Unknown Character")
    );
    content = (
      <>
        <CharacterStack
          characters={characters.flatMap((character) => character ?? [])}
        />
        <p className="vertically-centered-text">{[...names].join(", ")}</p>
      </>
    );

    entryContainsPlayerCharacter = entries(playerCollection).some(
      (player) =>
        !player.isGM &&
        characters.some(
          (character) => character && player.characterIds.includes(character.id)
        )
    );
  }

  const canEdit = canEditEntry(entry, myself, characterCollection);

  const characterIds =
    entry.type === "character" ? entry.characterIds : EMPTY_ARRAY;
  const characterIdsRef = useLatest(characterIds);

  const onHover = useRecoilCallback(
    ({ set, reset }) =>
      (hovered: boolean) => {
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
        className={clsx({
          current: isCurrentEntry,
          "player-character": entryContainsPlayerCharacter,
        })}
        onMouseOver={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
      >
        {content}
        {(canEdit || myself.isGM) && (
          <Button
            onClick={() => onRemoveEntry()}
            className={!canEdit && myself.isGM ? "gm-button" : undefined}
            style={{ marginRight: "0.25rem" }}
          >
            remove
          </Button>
        )}
        {canEdit || myself.isGM ? (
          <SmartIntegerInput
            value={entry.initiative}
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
          <p className="initiative-value">{entry.initiative}</p>
        )}
        {myself.isGM && (
          <Button
            className="gm-button"
            onClick={() => onSetCurrentEntry()}
            style={{ marginLeft: "0.25rem" }}
          >
            jump here
          </Button>
        )}
      </li>
    </Flipped>
  );
});

const myMapProps = ["id", "isGM", "currentMap", "characterIds"] as const;
type RRPlayerMapProps = Pick<RRPlayer, typeof myMapProps[number]>;

export const InitiativeTracker = React.memo(function InitiativeTracker() {
  const myself = useMyProps(...myMapProps);
  const initiativeTracker = useServerState((state) => state.initiativeTracker);

  if (!initiativeTracker.visible && !myself.isGM) {
    return null;
  }

  return (
    <InitiativeTrackerInner
      initiativeTracker={initiativeTracker}
      myself={myself}
    />
  );
});

function InitiativeTrackerInner({
  initiativeTracker,
  myself,
}: {
  initiativeTracker: InitiativeTrackerSyncedState;
  myself: RRPlayerMapProps;
}) {
  const dispatch = useServerDispatch();
  const characterCollection = useServerState((state) => state.characters);
  const playerCollection = useServerState((state) => state.players);
  const prompt = usePrompt();

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
    <div className="initiative-tracker">
      <RollInitiative
        initiativeTracker={initiativeTracker}
        characterCollection={characterCollection}
        myselfId={myself.id}
      />
      <Flipper flipKey={sortedRows.map((row) => row.id).join("-")}>
        <ul role="list">
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
      {endTurnButton}
      {myself.isGM && (
        <GMArea>
          <Button
            onClick={addLairAction}
            className="initiative-tracker-add-lair-action"
          >
            Add lair action
          </Button>
          <label>
            <input
              type="checkbox"
              checked={initiativeTracker.visible}
              onChange={(e) =>
                dispatch(initiativeTrackerSetVisible(e.target.checked))
              }
            />{" "}
            show initiative to players
          </label>
        </GMArea>
      )}
      {!initiativeTracker.visible && (
        <div className="initiative-tracker-hidden">
          <p>not visible to players</p>
        </div>
      )}
      {canEdit && <YourTurn endTurnButton={endTurnButton} />}
    </div>
  );
}

function RollInitiative({
  initiativeTracker,
  characterCollection,
  myselfId,
}: {
  initiativeTracker: InitiativeTrackerSyncedState;
  characterCollection: EntityCollection<RRCharacter>;
  myselfId: RRPlayerID;
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
    />
  );
}

const RollInitiativeDeferredImpl = React.memo<{
  initiativeTracker: InitiativeTrackerSyncedState;
  characterCollection: EntityCollection<RRCharacter>;
  myselfId: RRPlayerID;
  mapObjects: EntityCollection<RRMapObject>;
  mapObjectsOutdated: boolean;
}>(function RollInitiativeDeferredImpl({
  initiativeTracker,
  characterCollection,
  myselfId,
  mapObjects,
  mapObjectsOutdated,
}) {
  const dispatch = useServerDispatch();

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
        initiative: diceResult(action.payload),
        characterIds: selectedCharacterIds,
      }),
    ]);
  };

  return (
    <div className="initiative-tracker-roll">
      <Button
        disabled={selectionAlreadyInList || !hasSelection || mapObjectsOutdated}
        onClick={() => roll("none")}
      >
        Roll Initiative
        {selectedCharacters.length > 0
          ? selectedCharacters.length > 1
            ? ` for ${selectedCharacters.length} characters`
            : ` for ${selectedCharacters[0]!.name}`
          : ""}
      </Button>
      <Button className="initiative-modified" onClick={() => roll("advantage")}>
        Adv
      </Button>
      <Button
        className="initiative-modified"
        onClick={() => roll("disadvantage")}
      >
        Dis
      </Button>
      <input
        value={allHaveSameInitiative ? allSelectedInitiatives[0]! : modifier}
        disabled={allHaveSameInitiative || mapObjectsOutdated}
        onChange={(e) => setModifier(e.target.value)}
        placeholder="mod"
        title={
          allHaveSameInitiative
            ? `Using configured Modifier ${allSelectedInitiatives[0] ?? ""}`
            : "Modifier"
        }
      />
    </div>
  );
});

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
      className={clsx("initiative-tracker-turn-done", {
        "gm-button": !canEdit && myself.isGM,
      })}
      disabled={!(canEdit || myself.isGM)}
      onClick={onClick}
    >
      I am done with my turn!
    </Button>
  );
}

function YourTurn({ endTurnButton }: { endTurnButton: React.ReactNode }) {
  const [portal] = useContext(NotificationAreaPortal);
  return portal
    ? ReactDOM.createPortal(
        <div className="your-turn">It is your turn! {endTurnButton}</div>,
        portal
      )
    : null;
}
