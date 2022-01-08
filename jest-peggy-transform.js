import peggy from "peggy";
import createCacheKeyFunction from "@jest/create-cache-key-function";

// https://jestjs.io/docs/code-transformation
export default {
  process(sourceText) {
    return peggy.generate(sourceText, {
      output: "source",
      format: "commonjs",
    });
  },

  // https://github.com/facebook/jest/blob/main/packages/jest-create-cache-key-function/src/index.ts
  getCacheKey: createCacheKeyFunction.default([], []),
};
