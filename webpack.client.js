const path = require("path");
const webpack = require("webpack");
const GitRevisionPlugin = require("git-revision-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const webpackDevServerWaitpage = require("webpack-dev-server-waitpage");

const gitRevisionPlugin = new GitRevisionPlugin();

module.exports = (webpackEnv) => {
  const isEnvDevelopment = webpackEnv.development === true;
  const isEnvProduction = webpackEnv.production === true;

  return {
    target: "web",
    mode: isEnvProduction ? 'production' : isEnvDevelopment && 'development',
    bail: isEnvProduction,
    devtool: isEnvProduction
      ? 'source-map'
      : isEnvDevelopment && 'cheap-module-source-map',
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
    output: {
      // The build folder.
      path: isEnvProduction ? path.resolve(__dirname, "dist", "client") : undefined,
      // Add /* filename */ comments to generated require()s in the output.
      pathinfo: isEnvDevelopment,
      // There will be one main bundle, and one file per asynchronous chunk.
      // In development, it does not produce real files.
      filename: isEnvProduction ? "[name].[contenthash:8].js" : isEnvDevelopment && '[name].bundle.js',
      publicPath: "/",
      chunkFilename: isEnvProduction ? "[name].[contenthash:8].chunk.js" : isEnvDevelopment && "[name].chunk.js",
      // this defaults to 'window', but by setting it to 'this' then
      // module chunks which are built will work in web workers as well.
      globalObject: 'this',
    },
    optimization: {
      minimize: isEnvProduction,
      // Keep the runtime chunk separated to enable long term caching
      // https://twitter.com/wSokra/status/969679223278505985
      // https://github.com/facebook/create-react-app/issues/5358
      runtimeChunk: {
        name: entrypoint => `runtime-${entrypoint.name}`,
      },
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js", ".jsx"],
    },
    plugins: [
      new HtmlWebpackPlugin({
        title: "Roc & Roll",
        meta: {
           viewport: "initial-scale=1, maximum-scale=1, user-scalable=no, minimum-scale=1, width=device-width, height=device-height",
        },
        ...isEnvProduction
            ? {
                minify: {
                  removeComments: true,
                  collapseWhitespace: true,
                  removeRedundantAttributes: true,
                  useShortDoctype: true,
                  removeEmptyAttributes: true,
                  removeStyleLinkTypeAttributes: true,
                  keepClosingSlash: true,
                  minifyJS: true,
                  minifyCSS: true,
                  minifyURLs: true,
                },
              }
            : undefined
      }),
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
      isEnvDevelopment && new webpack.HotModuleReplacementPlugin(),
      isEnvDevelopment && new ReactRefreshWebpackPlugin(),
      new ForkTsCheckerWebpackPlugin({
        typescript: { configFile: "tsconfig.client.json" },
        async: isEnvDevelopment,
      }),
      new CleanWebpackPlugin(),
    ].filter(Boolean),
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
        },
        {
          test: /\.tsx?$/,
          include: path.resolve("src"),
          use: [
            {
              loader: "babel-loader",
              options: {
                cacheDirectory: true,
                cacheCompression: false,
                compact: isEnvProduction,
                babelrc: false,
                plugins: [
                  ["@babel/plugin-proposal-class-properties", { loose: true }],
                  "@babel/plugin-syntax-dynamic-import",
                  isEnvDevelopment && require.resolve('react-refresh/babel'),
                ].filter(Boolean),
                presets: [
                  [
                    "@babel/preset-env",
                    {
                      useBuiltIns: "entry",
                      corejs: 3
                    }
                  ],
                  ["@babel/preset-react", { development: isEnvDevelopment }],
                  "@babel/preset-typescript",
                ]
              }
            }
          ]
        }
      ],
    },
    devServer: isEnvDevelopment ? {
      // Enable gzip compression of generated files.
      compress: true,
      // Silence WebpackDevServer's own logs since they're generally not useful.
      // It will still show compile warnings and errors with this setting.
      clientLogLevel: 'none',
      contentBase: [path.join(__dirname, "src", "public")],
      watchContentBase: true,
      hot: true,
      port: 3001,
      historyApiFallback: {
        // Paths with dots should still use the history fallback.
        // See https://github.com/facebook/create-react-app/issues/387.
        disableDotRule: true,
      },
      overlay: {
        warnings: true,
        errors: true
      },
      disableHostCheck: true,
      before: (app, server) => {
        if (!process.env.CI) {
          app.use(webpackDevServerWaitpage(server, { theme: "material" }));
        }
      },
    } : undefined,
  };
}