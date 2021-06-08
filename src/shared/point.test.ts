import { makePoint, pointRotate } from "./point";

describe("RRPoint", () => {
  it.each([
    [[1, 1], [-1, 1], 90, [0, 0]],
    [[1, 1], [1, 1], 90, [1, 1]],
    [[1, 2], [0, 1], 90, [1, 1]],
  ] as const)("rotates points correctly", (input, output, degrees, origin) => {
    const result = pointRotate(
      makePoint(input[0], input[1]),
      degrees,
      makePoint(origin[0], origin[1])
    );
    const expectedResult = makePoint(output[0], output[1]);
    expect(result.x).toBeCloseTo(expectedResult.x);
    expect(result.y).toBeCloseTo(expectedResult.y);
  });
});
