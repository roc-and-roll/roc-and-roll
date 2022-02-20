// When building, webpack replaces all occurrences of process.env.NODE_ENV
// with either "production" or "development" (like a search and replace).
// However, we do not compile and package the contents of node_modules with
// webpack. Thus, files in node_modules still contain process.env.NODE_ENV.
// To make sure that these files are also aware of the correct environment,
// we manually set the environment variable NODE_ENV here. We have to use
// the construct with eval, so that webpack does not replace
// process.env.NODE_ENV with the constant.
//
// The code below will be compiled to something like:
//
// ```js
// const nodeEnv = "production"; // or "development"
// eval("process.env.NODE_ENV = nodeEnv;");
// ```
//
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const nodeEnv = process.env.NODE_ENV;
if (typeof nodeEnv !== "string") {
  throw new Error(`env is not a string, this should never happen.`);
}
eval("process.env.NODE_ENV = nodeEnv;");

export {};
