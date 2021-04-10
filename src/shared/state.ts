import { AnyAction, DeepPartial, Dispatch } from "redux";

export interface DiceRoll {
  what: string;
  result: number;
}

export interface MyState {
  diceRolls: { rolls: DiceRoll[] };
}

export type MyDispatch = Dispatch<AnyAction>;

export type StatePatch<D> = { patch: DeepPartial<D>; deletedKeys: string[] };
