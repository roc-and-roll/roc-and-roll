const path = require("path");
const webpack = require("webpack");
const nodeExternals = require("webpack-node-externals");
const GitRevisionPlugin = require("git-revision-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const NodemonPlugin = require('nodemon-webpack-plugin');
const CopyWebpackPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

const gitRevisionPlugin = new GitRevisionPlugin();

module.exports = (webpackEnv) => {
  const isEnvDevelopment = webpackEnv.development === true;
  const isEnvProduction = webpackEnv.production === true;

  return {
    target: "node",
    mode: isEnvProduction ? 'production' : isEnvDevelopment && 'development',
    bail: isEnvProduction,
    devtool: isEnvProduction
      ? 'source-map'
      : isEnvDevelopment && 'cheap-module-source-map',
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
          test: /\.svg$/,
          type: 'asset/resource',
          generator: {
            filename: 'svg/[hash][ext][query]'
          }
        },
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
      }),
      new CleanWebpackPlugin({
        cleanOnceBeforeBuildPatterns: ["**/*", "!client/**/*", "!client"],
      }),
      isEnvProduction && new CopyWebpackPlugin({
        patterns: [{
          from: "./src/public",
          to: "public"
        }]
      }),
      isEnvDevelopment && new ForkTsCheckerWebpackPlugin({
        typescript: {configFile: "tsconfig.server.json", mode: "write-tsbuildinfo" },
        async: isEnvDevelopment,
      }),
      isEnvDevelopment && new NodemonPlugin({
        script: './dist/server.roc-and-roll.js',
        // Arguments to pass to the script being watched.
        args: ["--workspace", "./workspace"],
        // Node arguments.
        // TODO: When enabling this, restarting due to code changes always
        // triggers an error that says that the debug port is already in use.
        // nodeArgs: ['--inspect'],

        nodeArgs: ['--unhandled-rejections=strict']
      }),
    ].filter(Boolean),
    resolve: {
      extensions: [".tsx", ".ts", ".js", ".jsx"]
    },
    output: {
      filename: "[name].roc-and-roll.js",
      path: path.resolve(__dirname, "dist"),
      // Makes sure that the file paths generated in the .js.map file are correct.
      // To verify, throw an error in server.ts. Clicking the file path in the
      // error message should open your editor.
      devtoolModuleFilenameTemplate: '../[resource-path]',
    },
    externals: [nodeExternals({ modulesFromFile: true })],
    stats: {
      assets: false
    }
  };
}