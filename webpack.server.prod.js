const CopyWebpackPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const { merge } = require("webpack-merge");
const common = require("./webpack.server.common.js");


module.exports = merge(common, {
  mode: "production",
  devtool: "source-map",
  plugins: [
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: ["**/*", "!client/**/*", "!client"]
    }),
    new CopyWebpackPlugin({
      patterns: [{
        from: "./src/public",
        to: "public"
      }]
    }),
  ]
});