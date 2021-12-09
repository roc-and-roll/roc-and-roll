import { randomBetweenInclusive } from "../../shared/random";
import {
  diceResult,
  diceResultString,
  isValidDiceString,
  parseDiceStringAndRoll,
  RollVisitor,
} from "./roll";

describe("dice rolling", () => {
  beforeEach(() => {
    RollVisitor.rollFunction = (min, max) => {
      return max;
    };
  });

  afterEach(() => {
    RollVisitor.rollFunction = randomBetweenInclusive;
  });

  test.each([
    ["", false],
    ["foo", false],

    ["42", true],
    ["+42", true],
    ["+ 42", true],
    ["1d3", true],
    ["d4", true],
    ["1d20", true],
    ["1a20", true],
    ["1i20", true],
    ["1d20+1", true],
    ["1d20-1", true],
    ["-2d4 - 9", true],
    [" 1d20 + 1 ", true],
    ["1d20 × 3", true],
    ["1d20 ÷ 3", true],
  ])('isValidDiceString: "%s" = %s', (diceString, valid) => {
    expect(isValidDiceString(diceString)).toBe(valid);
  });

  it.each([
    ["20 + 10 * 6", 80],
    ["10", 10],
    ["1 + 2", 3],
    ["1 + 2 + 3", 6],
    ["3 * 4", 12],
    ["3 * 4d10 - 1d8", 112],
  ])("calculates the result correctly", (rollString, result) => {
    expect(diceResult(parseDiceStringAndRoll(rollString))).toBe(result);
  });

  it.each([["3 + 3d20 * 10"], ["1+2"]])(
    "displays dice results as string",
    (rollString) => {
      expect(
        diceResultString(parseDiceStringAndRoll(rollString))
      ).toMatchSnapshot();
    }
  );
});
