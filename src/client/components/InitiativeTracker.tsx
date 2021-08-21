import clsx from "clsx";
import React, { useContext, useEffect } from "react";
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
  byId,
  entries,
  RRInitiativeTrackerEntry,
  RRPlayer,
  EMPTY_ENTITY_COLLECTION,
  EntityCollection,
  RRCharacter,
  InitiativeTrackerSyncedState,
  RRPlayerID,
} from "../../shared/state";
import { useMyMap, useMyself } from "../myself";
import { canControlToken } from "../permissions";
import { diceResult, rollInitiative } from "../roll";
import { useLatest, useServerDispatch, useServerState } from "../state";
import useLocalState from "../useLocalState";
import { GMArea } from "./GMArea";
import { CharacterStack } from "./characters/CharacterPreview";
import { Button } from "./ui/Button";
import { Flipper, Flipped } from "react-flip-toolkit";
import { useRecoilCallback, useRecoilValue } from "recoil";
import {
  highlightedCharactersFamily,
  selectedMapObjectIdsAtom,
} from "./map/MapContainer";
import { EMPTY_ARRAY, withDo } from "../../shared/util";
import ReactDOM from "react-dom";
import { NotificationTopAreaPortal } from "./Notifications";
import { Collapsible } from "./Collapsible";
import { SmartIntegerInput } from "./ui/TextInput";

function canEditEntry(
  entry: RRInitiativeTrackerEntry,
  myself: RRPlayer,
  characterCollection: EntityCollection<RRCharacter>
) {
  if (entry.type === "lairAction") {
    return myself.isGM;
  }

  return entry.characterIds.some((characterId) => {
    const character = byId(characterCollection.entities, characterId);
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
  myself: RRPlayer;
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
        {/* Add an empty TokenStack for correct padding */}
        <CharacterStack characters={[]} />
        <p>{entry.description}</p>
      </>
    );
  } else {
    const characters = entry.characterIds.map((id) =>
      byId(characterCollection.entities, id)
    );
    const names = new Set(
      characters.map((character) => character?.name ?? "Unknown Token")
    );
    content = (
      <>
        <CharacterStack
          characters={characters.flatMap((character) => character ?? [])}
        />
        <p>{[...names].join(", ")}</p>
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
          >
            remove
          </Button>
        )}
        <SmartIntegerInput
          value={entry.initiative}
          disabled={!(myself.isGM || canEdit)}
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
        {myself.isGM && (
          <Button className="gm-button" onClick={() => onSetCurrentEntry()}>
            jump here
          </Button>
        )}
      </li>
    </Flipped>
  );
});

export function InitiativeTracker() {
  const myself = useMyself();
  const initiativeTracker = useServerState((state) => state.initiativeTracker);

  if (!initiativeTracker.visible && !myself.isGM) {
    return null;
  }

  return (
    <Collapsible title="Initiative">
      <InitiativeTrackerInner
        initiativeTracker={initiativeTracker}
        myself={myself}
      />
    </Collapsible>
  );
}

function InitiativeTrackerInner({
  initiativeTracker,
  myself,
}: {
  initiativeTracker: InitiativeTrackerSyncedState;
  myself: RRPlayer;
}) {
  const dispatch = useServerDispatch();
  const characterCollection = useServerState((state) => state.characters);
  const playerCollection = useServerState((state) => state.players);

  const addLairAction = () => {
    const description = prompt(
      'How should we name this lair action in the initiative tracker ("Lair Action" works fine)?',
      "Lair Action"
    );
    if (!description) {
      return;
    }
    const initiativeStr = prompt("Enter the initiative value", "20");
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
  const nextRow =
    currentRowIndex >= 0
      ? rows[(currentRowIndex + 1) % rows.length]
      : undefined;

  const sortedRows =
    currentRowIndex >= 0
      ? [...rows.slice(currentRowIndex), ...rows.slice(0, currentRowIndex)]
      : rows;

  const canEdit =
    !!currentRow && canEditEntry(currentRow, myself, characterCollection);

  const endTurnButton = currentRow && (
    <EndTurnButton
      myself={myself}
      canEdit={canEdit}
      onClick={() => {
        if (!nextRow) {
          return;
        }
        dispatch(initiativeTrackerSetCurrentEntry(nextRow.id));
      }}
    />
  );

  return (
    <div className="initiative-tracker">
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
      <RollInitiative
        initiativeTracker={initiativeTracker}
        characterCollection={characterCollection}
        myselfId={myself.id}
      />
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

const RollInitiative = React.memo(function RollInitiative({
  initiativeTracker,
  characterCollection,
  myselfId,
}: {
  initiativeTracker: InitiativeTrackerSyncedState;
  characterCollection: EntityCollection<RRCharacter>;
  myselfId: RRPlayerID;
}) {
  const dispatch = useServerDispatch();

  const [modifier, setModifier, _] = useLocalState("initiative-modifier", "0");

  const mapObjects = useMyMap((map) => map?.objects ?? EMPTY_ENTITY_COLLECTION);
  const selectedMapObjectIds = useRecoilValue(selectedMapObjectIdsAtom).filter(
    Boolean
  );

  const selectedTokenIds = [
    ...new Set(
      selectedMapObjectIds.flatMap((mapObjectId) => {
        const mapObject = byId(mapObjects.entities, mapObjectId);
        return mapObject?.type === "token" ? mapObject.characterId : [];
      })
    ),
  ];

  const characterIdsInTracker = entries(initiativeTracker.entries).flatMap(
    (entry) => (entry.type === "character" ? entry.characterIds : [])
  );

  const selectionAlreadyInList = characterIdsInTracker.some((id) =>
    selectedTokenIds.includes(id)
  );

  const hasSelection = selectedTokenIds.length !== 0;

  const characters = selectedMapObjectIds.flatMap((id) =>
    withDo(byId(mapObjects.entities, id), (obj) =>
      obj?.type === "token"
        ? byId(characterCollection.entities, obj.characterId)
        : []
    )
  );

  const allSelectedInitiatives = [
    ...new Set(characters.map((c) => c?.attributes["initiative"] ?? null)),
  ];

  const allHaveSameInitiative =
    allSelectedInitiatives.length === 1 && allSelectedInitiatives[0] !== null;

  const roll = () => {
    const mod = allHaveSameInitiative
      ? allSelectedInitiatives[0]!
      : parseInt(modifier);
    const action = logEntryDiceRollAdd(
      rollInitiative(isNaN(mod) ? 0 : mod, "none", myselfId)
    );
    dispatch([
      action,
      initiativeTrackerEntryCharacterAdd({
        initiative: diceResult(action.payload),
        characterIds: selectedTokenIds,
      }),
    ]);
  };

  return (
    <div className="initiative-tracker-roll">
      <Button disabled={selectionAlreadyInList || !hasSelection} onClick={roll}>
        Roll Initiative
      </Button>
      <input
        value={allHaveSameInitiative ? allSelectedInitiatives[0]! : modifier}
        disabled={allHaveSameInitiative}
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
  myself: RRPlayer;
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
  const portal = useContext(NotificationTopAreaPortal);
  return portal?.current
    ? ReactDOM.createPortal(
        <div className="your-turn">It is your turn! {endTurnButton}</div>,
        portal.current
      )
    : null;
}
