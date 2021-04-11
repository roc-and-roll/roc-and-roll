import { PayloadAction } from "@reduxjs/toolkit";
import { Dispatch } from "redux";

export interface SyncedState {
  diceRolls: {
    rolls: {
      what: string;
      result: number;
    }[];
  };
}

export const initialSyncedState: SyncedState = {
  diceRolls: {
    rolls: [],
  },
};

export type SyncedStateAction = PayloadAction<any>;

export type SyncedStateDispatch = Dispatch<SyncedStateAction>;
