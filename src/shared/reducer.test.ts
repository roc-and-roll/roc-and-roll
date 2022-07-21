import { initiativeTrackerSetCurrentEntry } from "./actions";
import { reducer } from "./reducer";
import {
  initialSyncedState,
  makeCharacter,
  RRAsset,
  RRCharacter,
  RRInitiativeTrackerEntry,
  RRInitiativeTrackerEntryID,
  SyncedState,
} from "./state";
import { rrid } from "./util";

describe("withCharacterConcentrationReducer", () => {
  let state: SyncedState;
  const characterId = rrid<RRCharacter>();
  const lairActionId = rrid<RRInitiativeTrackerEntry>();
  const characterEntryId = rrid<RRInitiativeTrackerEntry>();

  function nextTurn(
    id: RRInitiativeTrackerEntryID | null,
    expectedRoundsLeft: number | null
  ) {
    state = reducer(state, initiativeTrackerSetCurrentEntry(id));
    expect(
      state.characters.entities[characterId]!.currentlyConcentratingOn
    ).toEqual(
      expectedRoundsLeft === null
        ? null
        : {
            name: "Light",
            roundsLeft: expectedRoundsLeft,
          }
    );
  }

  beforeEach(() => {
    state = {
      ...initialSyncedState,
      initiativeTracker: {
        currentEntryId: null,
        visible: true,
        entries: {
          entities: {
            [lairActionId]: {
              id: lairActionId,
              type: "lairAction",
              description: "",
              initiative: 20,
            },
            [characterEntryId]: {
              id: characterEntryId,
              type: "character",
              characterIds: [characterId],
              initiative: 15,
            },
          },
          ids: [lairActionId, characterEntryId],
        },
      },
      characters: {
        entities: {
          [characterId]: {
            id: characterId,
            ...makeCharacter("", rrid<RRAsset>(), ""),
            currentlyConcentratingOn: {
              name: "Light",
              roundsLeft: 3,
            },
          },
        },
        ids: [characterId],
      },
    };
  });

  it("works correctly", () => {
    nextTurn(lairActionId, 3);
    nextTurn(characterEntryId, 2);
    nextTurn(lairActionId, 2);
    nextTurn(characterEntryId, 1);
    nextTurn(lairActionId, 1);
    nextTurn(characterEntryId, 0);
    nextTurn(lairActionId, null);
    nextTurn(characterEntryId, null);
    nextTurn(lairActionId, null);
  });
  it("does not decrement roundsLeft when starting initiative", () => {
    nextTurn(characterEntryId, 3);
    nextTurn(lairActionId, 3);
    nextTurn(characterEntryId, 2);
  });
  it("does not decrement roundsLeft when starting initiative from an invalid currentEntryId", () => {
    state.initiativeTracker.currentEntryId = rrid<RRInitiativeTrackerEntry>();
    nextTurn(characterEntryId, 3);
    nextTurn(lairActionId, 3);
    nextTurn(characterEntryId, 2);
  });
  it("does not decrement roundsLeft when ending initiative", () => {
    nextTurn(characterEntryId, 3);
    nextTurn(null, 3);
  });
  it("does not decrement roundsLeft when going to the same character", () => {
    nextTurn(characterEntryId, 3);
    nextTurn(characterEntryId, 3);
    nextTurn(characterEntryId, 3);
  });
});
