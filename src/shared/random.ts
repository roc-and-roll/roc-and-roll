// Will import just an empty object when used in the browser, because
// resolve.fallback.crypto is set to false in webpack.client.js.
import nodeCrypto from "crypto";

const UINT32_MAX = 0xffffffff;

export function randomBetweenInclusive(min: number, max: number) {
  if (max < min) {
    throw new Error(
      `Cannot generate a random number where max is less than min!`
    );
  }
  const range = max - min + 1;

  if (
    !Number.isInteger(min) ||
    !Number.isInteger(max) ||
    min > max ||
    range > UINT32_MAX
  ) {
    throw new Error(`min and/or max are invalid.`);
  }

  let number;
  do {
    number = randomUint32();

    // Remove modulo bias
    // https://stackoverflow.com/questions/10984974/why-do-people-say-there-is-modulo-bias-when-using-a-random-number-generator
  } while (number >= UINT32_MAX - (UINT32_MAX % range));

  return (number % range) + min;
}

function randomUint32() {
  const array = new Uint32Array(1);

  if ("randomFillSync" in nodeCrypto) {
    nodeCrypto.randomFillSync(array);
  } else {
    // @ts-ignore This is a type error on Node.js
    window.crypto.getRandomValues(array);
  }

  return array[0]!;
}
