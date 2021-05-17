import clsx from "clsx";
import React, { useContext } from "react";
import {
  initiativeTrackerEntryLairActionAdd,
  initiativeTrackerEntryLairActionUpdate,
  initiativeTrackerEntryRemove,
  initiativeTrackerEntryCharacterAdd,
  initiativeTrackerEntryCharacterUpdate,
  initiativeTrackerSetCurrentEntry,
  logEntryDiceRollAdd,
} from "../../shared/actions";
import {
  byId,
  entries,
  RRInitiativeTrackerEntry,
  RRPlayer,
  CharactersSyncedState,
} from "../../shared/state";
import { useMyMap, useMyself } from "../myself";
import { canControlToken } from "../permissions";
import { diceResult, rollInitiative } from "../roll";
import {
  useOptimisticDebouncedServerUpdate,
  useServerDispatch,
  useServerState,
} from "../state";
import useLocalState from "../useLocalState";
import { GMArea } from "./GMArea";
import { TokenStack } from "./tokens/TokenPreview";
import { Button } from "./ui/Button";
import { Flipper, Flipped } from "react-flip-toolkit";
import { useRecoilValue } from "recoil";
import { selectedMapObjectIdsAtom } from "./map/MapContainer";
import {
  assertNever,
  EMPTY_ENTITY_COLLECTION,
  withDo,
} from "../../shared/util";
import ReactDOM from "react-dom";
import { NotificationTopAreaPortal } from "./Notifications";

function canEditEntry(
  entry: RRInitiativeTrackerEntry,
  myself: RRPlayer,
  tokenCollection: CharactersSyncedState
) {
  if (entry.type === "lairAction") {
    return myself.isGM;
  }

  return entry.characterIds.some((tokenId) => {
    const token = byId(tokenCollection.entities, tokenId);
    return (
      token &&
      (canControlToken(token, { ...myself, isGM: false }) ||
        (myself.isGM && token.localToMap))
    );
  });
}

const InitiativeEntry = React.memo<{
  entry: RRInitiativeTrackerEntry;
  tokenCollection: CharactersSyncedState;
  isCurrentEntry: boolean;
  myself: RRPlayer;
  inverseIdx: number;
}>(function InitiativeEntry({
  entry,
  tokenCollection,
  isCurrentEntry,
  myself,
  inverseIdx,
}) {
  const dispatch = useServerDispatch();
  const onSetCurrentEntry = () =>
    dispatch(initiativeTrackerSetCurrentEntry(entry.id));

  const onRemoveEntry = () => dispatch(initiativeTrackerEntryRemove(entry.id));

  let content = null;
  if (entry.type === "lairAction") {
    content = (
      <>
        {/* Add an empty TokenStack for correct padding */}
        <TokenStack tokens={[]} />
        <p>{entry.description}</p>
      </>
    );
  } else {
    const tokens = entry.characterIds.map((id) =>
      byId(tokenCollection.entities, id)
    );
    const names = new Set(
      tokens.map((token) => token?.name ?? "unknown token")
    );
    content = (
      <>
        <TokenStack tokens={tokens.flatMap((token) => token ?? [])} />
        <p>{[...names].join(", ")}</p>
      </>
    );
  }

  const [initiative, setInitiative] = useOptimisticDebouncedServerUpdate(
    entry.initiative.toString(),
    (initiativeStr) => {
      const initiative = parseInt(initiativeStr);
      if (isNaN(initiative)) {
        return;
      }

      switch (entry.type) {
        case "character":
          return initiativeTrackerEntryCharacterUpdate({
            id: entry.id,
            changes: {
              initiative,
            },
          });
        case "lairAction":
          return initiativeTrackerEntryLairActionUpdate({
            id: entry.id,
            changes: {
              initiative,
            },
          });
        default:
          assertNever(entry);
      }
    },
    1000
  );

  const canEdit = canEditEntry(entry, myself, tokenCollection);

  return (
    <Flipped
      flipId={entry.id}
      onStart={(element) => (element.style.zIndex = inverseIdx.toString())}
      onComplete={(element) => (element.style.zIndex = "")}
    >
      <li key={entry.id} className={isCurrentEntry ? "current" : undefined}>
        {content}
        {(canEdit || myself.isGM) && (
          <Button
            onClick={() => onRemoveEntry()}
            className={!canEdit && myself.isGM ? "gm-button" : undefined}
          >
            remove
          </Button>
        )}
        <input
          type="number"
          value={initiative}
          disabled={!(myself.isGM || canEdit)}
          onChange={(e) => setInitiative(e.target.value)}
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
  const [modifier, setModifier, _] = useLocalState("initiative-modifier", "0");
  const dispatch = useServerDispatch();
  const myself = useMyself();
  const initiativeTracker = useServerState((state) => state.initiativeTracker);
  const tokenCollection = useServerState((state) => state.characters);

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

  const characterIdsInTracker = entries(
    initiativeTracker.entries
  ).flatMap((entry) => (entry.type === "character" ? entry.characterIds : []));
  const selectionAlreadyInList = characterIdsInTracker.some((id) =>
    selectedTokenIds.includes(id)
  );
  const hasSelection = selectedTokenIds.length !== 0;

  const characters = selectedMapObjectIds.flatMap((id) =>
    withDo(byId(mapObjects.entities, id), (obj) =>
      obj?.type === "token"
        ? byId(tokenCollection.entities, obj.characterId)
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
      rollInitiative(isNaN(mod) ? 0 : mod, "none", myself.id)
    );
    dispatch([
      action,
      initiativeTrackerEntryCharacterAdd({
        initiative: diceResult(action.payload),
        characterIds: selectedTokenIds,
      }),
    ]);
  };

  const addLairAction = () => {
    const description = prompt("Describe this lair action");
    if (!description) {
      return;
    }
    const initiativeStr = prompt("Enter the initiative value");
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
    !!currentRow && canEditEntry(currentRow, myself, tokenCollection);

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
              tokenCollection={tokenCollection}
              myself={myself}
            />
          ))}
        </ul>
      </Flipper>
      {endTurnButton}
      <div className="initiative-tracker-roll">
        <Button
          disabled={selectionAlreadyInList || !hasSelection}
          onClick={roll}
        >
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
      {myself.isGM && (
        <GMArea>
          <Button
            onClick={addLairAction}
            className="initiative-tracker-add-lair-action"
          >
            Add lair action
          </Button>
        </GMArea>
      )}
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
