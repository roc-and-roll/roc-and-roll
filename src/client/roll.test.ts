import { randomBetweenInclusive } from "./roll";
import nodeCrypto from "crypto";

// Tests run on Node.js, therefore window.crypto is not defined.
// We need to define it ourselves using Node.js' crypto API.
Object.defineProperty(globalThis, "crypto", {
  value: {
    getRandomValues: (arr: NodeJS.ArrayBufferView) =>
      nodeCrypto.randomFillSync(arr),
  },
});

describe("goodRandom", () => {
  it.each([
    [0, 0],
    [0, 10],
    [1, 20],
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
  });
});
