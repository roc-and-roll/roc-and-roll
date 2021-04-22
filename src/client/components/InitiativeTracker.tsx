import React from "react";
import {
  initiativeTrackerEntryLairActionUpdate,
  initiativeTrackerEntryTokenAdd,
  initiativeTrackerEntryTokenUpdate,
  logEntryDiceRollAdd,
} from "../../shared/actions";
import {
  RRInitiativeTrackerEntry,
  RRToken,
  TokensSyncedState,
} from "../../shared/state";
import { useMyself } from "../myself";
import { diceResult, rollInitiative } from "../roll";
import {
  byId,
  entries,
  useDebouncedServerUpdate,
  useServerDispatch,
  useServerState,
} from "../state";
import useLocalState from "../useLocalState";
import { TokenStack } from "./TokenManager";

function InitiativeEntry({
  entry,
  tokenCollection,
}: {
  entry: RRInitiativeTrackerEntry;
  tokenCollection: TokensSyncedState;
}) {
  let content = null;
  if (entry.type === "lairAction") {
    content = entry.description;
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

  return (
    <li key={entry.id}>
      {content}
      <input
        type="number"
        value={initiative}
        onChange={(e) => setInitiative(e.target.value)}
      />
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

  return (
    <div className="initiative-tracker">
      <ul role="list">
        {entries(initiativeTracker.entries).map((entry) => {
          return (
            <InitiativeEntry
              key={entry.id}
              entry={entry}
              tokenCollection={tokenCollection}
            />
          );
        })}
      </ul>
      <button className="initiative-tracker-turn-done">
        I am done with my turn!
      </button>
      <div className="initiative-tracker-roll">
        <button onClick={roll}>Roll Initiative</button>
        <input value={modifier} onChange={(e) => setModifier(e.target.value)} />
      </div>
    </div>
  );
}
