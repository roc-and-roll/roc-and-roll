import {
  DiceRollTree,
  DRTPartDice,
  isDiceRollTree,
} from "./dice-roll-tree-types-and-validation";

it("correctly validates the absence of dice results", () => {
  expect(
    isDiceRollTree(false)({
      type: "dice",
      count: 5,
      results: "not-yet-rolled",
      modified: "none",
      faces: 6,
      damage: {
        type: null,
      },
    })
  ).toBe(true);

  expect(
    isDiceRollTree(false)({
      type: "dice",
      count: 5,
      results: [1, 2, 3, 4, 5],
      modified: "none",
      faces: 6,
      damage: {
        type: null,
      },
    })
  ).toBe(false);
});

it("correctly validates the presence of dice results", () => {
  expect(
    isDiceRollTree(true)({
      type: "dice",
      count: 5,
      results: [1, 2, 3, 4, 5],
      modified: "none",
      faces: 6,
      damage: {
        type: null,
      },
    })
  ).toBe(true);

  expect(
    isDiceRollTree(true)({
      type: "dice",
      count: 5,
      results: "not-yet-rolled",
      modified: "none",
      faces: 6,
      damage: {
        type: null,
      },
    })
  ).toBe(false);
});

it("validates that rolled dice parts have exactly .count entries in .results", () => {
  expect(
    isDiceRollTree(true)({
      type: "dice",
      count: 5,
      results: [1, 2, 3, 4, 5],
      modified: "none",
      faces: 6,
      damage: {
        type: null,
      },
    })
  ).toBe(true);

  const errors: string[] = [];
  expect(
    isDiceRollTree(true)(
      {
        type: "dice",
        count: 5,
        results: [1, 2, 3, 4], // one too few
        modified: "none",
        faces: 6,
        damage: {
          type: null,
        },
      },
      { errors }
    )
  ).toBe(false);
  expect(errors).toMatchInlineSnapshot(`
Array [
  ".#1.type: Expected \\"term\\" (got \\"dice\\")",
  ".#2.type: Expected \\"parens\\" (got \\"dice\\")",
  ".#3.type: Expected \\"negated\\" (got \\"dice\\")",
  ".#4: A rolled dice part should have exactly as many dice roll results as its dice count (count = 5, results = 4)",
  ".#5.type: Expected \\"num\\" (got \\"dice\\")",
]
`);
});

{
  type WithResults = DiceRollTree<true>;
  type WithoutResults = DiceRollTree<false>;

  let _with: WithResults = null as unknown as WithResults;
  let _without: WithoutResults = null as unknown as WithoutResults;

  // @ts-expect-error It should not be possible to assign a DiceRollTree without
  // dice results to a DiceRollTree with dice results.
  _with = _without;

  // @ts-expect-error It should not be possible to assign a DiceRollTree with
  // dice results to a DiceRollTree without dice results.
  _without = _with;
}

{
  type WithResults = DRTPartDice<true>;
  type WithoutResults = DRTPartDice<false>;

  let _with: WithResults = null as unknown as WithResults;
  let _without: WithoutResults = null as unknown as WithoutResults;

  // @ts-expect-error It should not be possible to assign a DRTPartDice without
  // dice results to a DRTPartDice with dice results.
  _with = _without;

  // @ts-expect-error It should not be possible to assign a DRTPartDice with
  // dice results to a DRTPartDice without dice results.
  _without = _with;
}
