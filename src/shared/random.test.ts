import { randomBetweenInclusive } from "./random";

describe("randomBetweenInclusive", () => {
  it.each([
    [0, 10],
    [1, 20],
    [-5, -1],
  ] as const)("works for numbers between %s and %s", (min, max) => {
    const results = new Map<number, number>();

    for (let i = 0; i < 10000; i++) {
      const result = randomBetweenInclusive(min, max);
      expect(result).toBeGreaterThanOrEqual(min);
      expect(result).toBeLessThanOrEqual(max);

      if (!results.has(result)) {
        results.set(result, 0);
      }
      results.set(result, results.get(result)! + 1);
    }

    expect(results.size).toBe(max - min + 1);
    for (let i = min; i <= max; i++) {
      expect(results.has(i));
    }
  });

  it("works with min == max", () => {
    expect(randomBetweenInclusive(2, 2)).toBe(2);
    expect(randomBetweenInclusive(-5, -5)).toBe(-5);
  });

  it("throws an error for invalid parameters", () => {
    expect(() => randomBetweenInclusive(1, 2.5)).toThrowError();
    expect(() => randomBetweenInclusive(3, 2)).toThrowError();
    expect(() => randomBetweenInclusive(0, 0x1ffffffff)).toThrowError();
    expect(() => randomBetweenInclusive(-5, -6)).toThrowError();
  });
});
