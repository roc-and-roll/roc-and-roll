import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { initialSyncedState } from "../../shared/state";

export const sliceOfState = createSlice({
  name: "diceRolls",
  initialState: initialSyncedState.diceRolls,
  reducers: {
    rollDice: (state, action: PayloadAction<number>) => {
      const what = `1d${action.payload}`;
      const result = 1 + Math.round(Math.random() * (action.payload - 1));
      console.log(`Rolling ${what}, result: ${result}`);
      state.rolls.push({
        what,
        result,
      });
    },
  },
});

export const { rollDice } = sliceOfState.actions;

export default sliceOfState.reducer;
