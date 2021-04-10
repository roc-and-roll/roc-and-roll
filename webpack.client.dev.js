const path = require("path");
const { merge } = require("webpack-merge");
const common = require("./webpack.client.common.js");
const webpackDevServerWaitpage = require("webpack-dev-server-waitpage");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

module.exports = merge(common, {
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        include: path.resolve("src"),
        use: [
          {
            loader: "babel-loader",
            options: {
              cacheDirectory: true,
              babelrc: false,
              plugins: [
                ["@babel/plugin-proposal-class-properties", { loose: true }],
                "@babel/plugin-syntax-dynamic-import",
                require.resolve('react-refresh/babel'),
              ],
              presets: [
                [
                  "@babel/preset-env",
                  {
                    useBuiltIns: "entry",
                    corejs: 3
                  }
                ],
                "@babel/preset-typescript",
                ["@babel/preset-react", { development: true }]
              ]
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin({ typescript: { configFile: "tsconfig.client.json" } }),
    new ReactRefreshWebpackPlugin(),
  ],
  devServer: {
    contentBase: [path.join(__dirname, "src", "public")],
    // Enabling this disables hot reloading, for some reason. I think it might
    // have to do with the custom generateSVGs webpack plugin.
    watchContentBase: false,
    port: 3001,
    historyApiFallback: true,
    hot: true,
    overlay: {
      warnings: true,
      errors: true
    },
    before: (app, server) => {
      if (!process.env.CI) {
        app.use(webpackDevServerWaitpage(server, { theme: "material" }));
      }
    },
  },
  devtool: "source-map",
  mode: "development",
  stats: {
    entrypoints: false,
    children: false,
    assets: false,
    modules: false
  }
});
