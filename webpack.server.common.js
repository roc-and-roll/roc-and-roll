const path = require("path");
const webpack = require("webpack");
const nodeExternals = require("webpack-node-externals");
const GitRevisionPlugin = require("git-revision-webpack-plugin");

const gitRevisionPlugin = new GitRevisionPlugin();

module.exports = {
  target: "node",
  node: {
    // Setting these to false prevents webpack from replacing them by "/"
    // and therefore retains the original Node.js behaviour.
    __dirname: false,
    __filename: false
  },
  entry: {
    // Make sure to also change `package.json` -> `jest` -> `setupFiles` when
    // you change these files.
    server: [
      // Support for sourcemaps
      "source-map-support/register",
      // Entrypoint
      "./src/server/server.ts"
    ]
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        include: path.resolve('src'),
        use: [
          {
            loader: "ts-loader",
            options: {
              transpileOnly: true,
              configFile: "tsconfig.server.json"
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      // Heroku deletes the .git folder, therefore this command fails.
      // We cannot use the Dyno Metadata lab feature, because those are
      // not available while building.
      // https://devcenter.heroku.com/articles/dyno-metadata
      // That is why we set a custom environment variable which IS available
      // during build time:
      // $ heroku config:set HEROKU=1
      '__VERSION__': JSON.stringify(process.env.HEROKU ? "master" : gitRevisionPlugin.version()),
    })
  ],
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".jsx"]
  },
  output: {
    filename: "[name].roc-and-roll.js",
    path: path.resolve(__dirname, "dist")
  },
  externals: [nodeExternals({ modulesFromFile: true })],
  stats: {
    assets: false
  }
};
