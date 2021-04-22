import clsx from "clsx";
import React from "react";
import {
  initiativeTrackerEntryLairActionAdd,
  initiativeTrackerEntryLairActionUpdate,
  initiativeTrackerEntryRemove,
  initiativeTrackerEntryTokenAdd,
  initiativeTrackerEntryTokenUpdate,
  initiativeTrackerSetCurrentEntry,
  logEntryDiceRollAdd,
} from "../../shared/actions";
import {
  RRInitiativeTrackerEntry,
  RRPlayer,
  RRToken,
  TokensSyncedState,
} from "../../shared/state";
import { useMyself } from "../myself";
import { canControlToken } from "../permissions";
import { diceResult, rollInitiative } from "../roll";
import {
  byId,
  entries,
  useDebouncedServerUpdate,
  useServerDispatch,
  useServerState,
} from "../state";
import useLocalState from "../useLocalState";
import { GMArea } from "./GMArea";
import { TokenStack } from "./TokenManager";

function InitiativeEntry({
  entry,
  tokenCollection,
  isCurrentEntry,
  onSetCurrentEntry,
  onRemoveEntry,
  myself,
}: {
  entry: RRInitiativeTrackerEntry;
  tokenCollection: TokensSyncedState;
  isCurrentEntry: boolean;
  onSetCurrentEntry: () => void;
  onRemoveEntry: () => void;
  myself: RRPlayer;
}) {
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
    const tokens = entry.tokenIds.map((id) =>
      byId(tokenCollection.entities, id)
    );
    const names = new Set(
      tokens.map((token) => token?.name ?? "unknown token")
    );
    content = (
      <>
        <TokenStack tokens={tokens.filter((token) => !!token) as RRToken[]} />
        <p>{[...names].join(", ")}</p>
      </>
    );
  }

  const [initiative, setInitiative] = useDebouncedServerUpdate(
    entry.initiative.toString(),
    (initiativeStr) => {
      const initiative = parseInt(initiativeStr);
      if (isNaN(initiative)) {
        return;
      }

      if (entry.type === "token") {
        return initiativeTrackerEntryTokenUpdate({
          id: entry.id,
          changes: {
            initiative,
          },
        });
      } else if (entry.type === "lairAction") {
        return initiativeTrackerEntryLairActionUpdate({
          id: entry.id,
          changes: {
            initiative,
          },
        });
      }
    },
    1000
  );

  const canEdit =
    myself.isGM ||
    (entry.type !== "lairAction" &&
      entry.tokenIds.some((tokenId) => {
        const token = byId(tokenCollection.entities, tokenId);
        return token && canControlToken(token, myself);
      }));

  return (
    <li key={entry.id} className={isCurrentEntry ? "current" : undefined}>
      {content}
      {canEdit && (
        <button
          onClick={() => onRemoveEntry()}
          className={myself.isGM ? "gm-button" : undefined}
        >
          remove
        </button>
      )}
      <input
        type="number"
        value={initiative}
        disabled={!(myself.isGM || canEdit)}
        onChange={(e) => setInitiative(e.target.value)}
      />
      {myself.isGM && (
        <button className="gm-button" onClick={() => onSetCurrentEntry()}>
          jump here
        </button>
      )}
    </li>
  );
}

export function InitiativeTracker() {
  const [modifier, setModifier, _] = useLocalState("initiative-modifier", "0");
  const dispatch = useServerDispatch();
  const myself = useMyself();
  const initiativeTracker = useServerState((state) => state.initiativeTracker);
  const tokenCollection = useServerState((state) => state.tokens);

  const roll = () => {
    // TODO: Get selection from map, or if just one token of this user is on the map, use that.
    const selectedTokenIds = myself.tokenIds;
    if (selectedTokenIds.length === 0) {
      alert("Please select the token(s) to roll initiative for.");
      return;
    }

    const mod = parseInt(modifier);
    const action = logEntryDiceRollAdd(
      rollInitiative(isNaN(mod) ? 0 : mod, "none", myself.id)
    );
    dispatch(action);
    dispatch(
      initiativeTrackerEntryTokenAdd({
        initiative: diceResult(action.payload),
        tokenIds: selectedTokenIds,
      })
    );
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

  const itIsMyTurn =
    currentRow &&
    ((currentRow.type === "lairAction" && myself.isGM) ||
      (currentRow.type === "token" &&
        currentRow.tokenIds.some((tokenId) =>
          myself.tokenIds.includes(tokenId)
        )));

  return (
    <div className="initiative-tracker">
      <ul role="list">
        {sortedRows.map((entry) => (
          <InitiativeEntry
            key={entry.id}
            entry={entry}
            isCurrentEntry={entry.id === initiativeTracker.currentEntryId}
            onSetCurrentEntry={() =>
              dispatch(initiativeTrackerSetCurrentEntry(entry.id))
            }
            onRemoveEntry={() =>
              dispatch(initiativeTrackerEntryRemove(entry.id))
            }
            tokenCollection={tokenCollection}
            myself={myself}
          />
        ))}
      </ul>
      <button
        className={clsx("initiative-tracker-turn-done", {
          "gm-button": !itIsMyTurn && myself.isGM,
        })}
        disabled={!(itIsMyTurn || myself.isGM)}
        onClick={() => {
          if (!nextRow) {
            return;
          }
          dispatch(initiativeTrackerSetCurrentEntry(nextRow.id));
        }}
      >
        I am done with my turn!
      </button>
      <div className="initiative-tracker-roll">
        <button onClick={roll}>Roll Initiative</button>
        <input
          value={modifier}
          onChange={(e) => setModifier(e.target.value)}
          placeholder="mod"
          title="modifier"
        />
      </div>
      {myself.isGM && (
        <GMArea>
          <button
            onClick={addLairAction}
            className="initiative-tracker-add-lair-action"
          >
            Add lair action
          </button>
        </GMArea>
      )}
      {itIsMyTurn && <YourTurn />}
    </div>
  );
}

function YourTurn() {
  return <div className="your-turn">It is your turn!</div>;
}