const path = require("path");
const webpack = require("webpack");
const GitRevisionPlugin = require("git-revision-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const gitRevisionPlugin = new GitRevisionPlugin();

module.exports = {
  target: "web",
  entry: {
    client: [
      // Polyfills
      // https://github.com/zloirock/core-js/blob/master/docs/2019-03-19-core-js-3-babel-and-a-look-into-the-future.md
      "core-js/stable",
      "regenerator-runtime/runtime",
      // Polyfills for import()
      // https://babeljs.io/docs/en/next/babel-plugin-syntax-dynamic-import.html#working-with-webpack-and-babel-preset-env
      "core-js/features/promise",
      "core-js/features/array/iterator",
      // Entrypoint
      "./src/client/client.ts",
    ],
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
    }),
    new HtmlWebpackPlugin({
      title: "Roc & Roll",
      // meta: {
      //   viewport: "initial-scale=1, maximum-scale=1, user-scalable=no, minimum-scale=1, width=device-width, height=device-height",
      //   "apple-mobile-web-app-capable": "yes",
      //   "mobile-web-app-capable": "yes",
      // }
    }),
    new CleanWebpackPlugin(),
  ],
  module: {
    rules: [
      {
        test: /\.(s[ac]|c)ss$/i,
        use: [
          // Creates `style` nodes from JS strings
          "style-loader",
          // Translates CSS into CommonJS
          "css-loader",
          // Compiles Sass to CSS
          "sass-loader",
        ],
      },
      {
        test: /\.(eot|svg|ttf|woff|woff2)$/,
        loader: 'file-loader'
      }
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".jsx"],
  },
  output: {
    publicPath: "/",
    filename: "[name].bundle.js",
    chunkFilename: "[name].chunk.js",
    path: path.resolve(__dirname, "dist", "client"),
  },
};

