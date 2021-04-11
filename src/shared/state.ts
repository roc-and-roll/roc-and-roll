import { PayloadAction } from "@reduxjs/toolkit";
import { Dispatch } from "redux";

export interface DiceRoll {
  what: string;
  result: number;
}

export interface SyncedState {
  diceRolls: { rolls: DiceRoll[] };
}

export const initialSyncedState: SyncedState = {
  diceRolls: {
    rolls: [],
  },
};

export type SyncedStateAction = PayloadAction<any>;

export type SyncedStateDispatch = Dispatch<SyncedStateAction>;
