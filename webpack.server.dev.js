const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const NodemonPlugin = require('nodemon-webpack-plugin');
const { merge } = require("webpack-merge");
const common = require("./webpack.server.common.js");

module.exports = merge(common, {
  mode: "development",
  devtool: "eval-cheap-module-source-map",
  plugins: [
    new ForkTsCheckerWebpackPlugin({ typescript: {configFile: "tsconfig.server.json" } }),
    new NodemonPlugin({
      // Arguments to pass to the script being watched.
      args: [],
      // Node arguments.
      nodeArgs: ['--inspect'],
    })
  ],
});
