const path = require("path");
const { merge } = require("webpack-merge");
const common = require("./webpack.client.common.js");

module.exports = merge(common, {
  mode: "production",
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        include: path.resolve('src'),
        use: [
          {
            loader: "babel-loader",
            options: {
              cacheDirectory: true,
              babelrc: false,
              plugins: [
                ["@babel/plugin-proposal-class-properties", { loose: true }],
                "@babel/plugin-syntax-dynamic-import",
              ],
              presets: [
                [
                  '@babel/preset-env',
                  {
                    targets: {
                      browsers: "defaults"
                    },
                    useBuiltIns: "entry",
                    corejs: 3
                  }
                ],
                "@babel/preset-typescript",
                "@babel/preset-react"
              ],
            },
          },
        ],
      },
    ]
  },
  output: {
    // Include hash in file name for cache invalidation
    // https://webpack.js.org/guides/caching/#output-filenames
    filename: "[name].[chunkhash].js",
    chunkFilename: "[name].[chunkhash].js",
  },
});
