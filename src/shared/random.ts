// Will import just an empty object when used in the browser, because
// resolve.fallback.crypto is set to false in webpack.client.js.
import nodeCrypto from "crypto";

export function randomBetweenInclusive(min: number, max: number) {
  if (max < min) {
    throw new Error(
      `Cannot generate a random number where max is less than min!`
    );
  }
  const range = max - min + 1;

  if (!Number.isInteger(min) || !Number.isInteger(max) || range >= 0xffffffff) {
    throw new Error(`min and/or max are invalid.`);
  }

  const array = new Uint32Array(1);

  if ("randomFillSync" in nodeCrypto) {
    nodeCrypto.randomFillSync(array);
  } else {
    window.crypto.getRandomValues(array);
  }

  return (array[0]! % range) + min;
}
