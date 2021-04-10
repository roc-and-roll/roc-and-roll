import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Define a type for the slice state
interface DiceRollsState {
  diceRolls: Array<{
    what: string;
    result: number;
  }>;
}

// Define the initial state using that type
const initialState: DiceRollsState = {
  diceRolls: [],
};

export const sliceOfState = createSlice({
  name: "diceRolls",
  initialState,
  reducers: {
    rollDice: (state, action: PayloadAction<number>) => {
      const what = `1d${action.payload}`;
      const result = 1 + Math.round(Math.random() * (action.payload - 1));
      console.log(`Rolling ${what}, result: ${result}`);
      state.diceRolls.push({
        what,
        result,
      });
    },
  },
});

export const { rollDice } = sliceOfState.actions;

export default sliceOfState.reducer;
