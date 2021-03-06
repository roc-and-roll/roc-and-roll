import path from "path";
import { fileURLToPath } from "url";
import webpack from "webpack";
import nodeExternals from "webpack-node-externals";
import { GitRevisionPlugin } from "git-revision-webpack-plugin";
import NodemonPlugin from "nodemon-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import { CleanWebpackPlugin } from "clean-webpack-plugin";

const gitRevisionPlugin = new GitRevisionPlugin();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (webpackEnv) => {
  const isEnvDevelopment = webpackEnv.mode === "development";
  const isEnvE2E = webpackEnv.mode === "e2e";
  const isEnvProduction = webpackEnv.mode === "production";

  if (!isEnvDevelopment && !isEnvE2E && !isEnvProduction) {
    throw new Error(
      "You must specify either '--env mode=development', '--env mode=production', or '--env mod=e2e'."
    );
  }

  const outputPath = path.join(__dirname, "dist", webpackEnv.mode);

  return {
    target: "node14",
    externalsPresets: { node: true },
    experiments: {
      outputModule: true,
    },
    externalsType: "module",
    externals: [
      nodeExternals({
        allowlist: ["core-js/stable"],
        modulesFromFile: true,
        importType: (moduleId) => {
          // Many dependencies do not (yet?) work as ES modules. Thus, we only opt
          // into ES modules for those dependencies that do no longer work as
          // commonjs modules.
          return `${
            ["node-fetch", "p-limit", "env-paths"].includes(moduleId)
              ? "module"
              : "node-commonjs"
          } ${moduleId}`;
        },
      }),
    ],
    mode: isEnvProduction ? "production" : "development",
    bail: isEnvProduction || isEnvE2E,
    devtool:
      isEnvProduction || isEnvE2E
        ? "source-map"
        : isEnvDevelopment && "cheap-module-source-map",
    node: {
      // Setting these to false prevents webpack from replacing them by "/"
      // and therefore retains the original Node.js behavior.
      __dirname: false,
      __filename: false,
    },
    entry: {
      // Make sure to also change `package.json` -> `jest` -> `setupFiles` when
      // you change these files.
      server: [
        // Polyfills
        "core-js/stable",
        // Set process.env correctly
        "./src/server/env.ts",
        // Support for sourcemaps
        "source-map-support/register.js",
        // Entrypoint
        "./src/server/server.ts",
      ],
    },
    module: {
      rules: [
        {
          test: /\.svg$/,
          type: "asset/resource",
          generator: {
            filename: "svg/[hash][ext][query]",
          },
        },
        {
          test: /\.tsx?$/,
          include: path.resolve("src"),
          use: [
            {
              loader: "swc-loader",
              options: {
                env: {
                  targets: "current node",
                },
              },
            },
          ],
        },
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
        __VERSION__: JSON.stringify(
          process.env.HEROKU ? "main" : gitRevisionPlugin.version()
        ),
      }),
      new CleanWebpackPlugin({
        cleanOnceBeforeBuildPatterns: ["**/*", "!client/**/*", "!client"],
      }),
      (isEnvProduction || isEnvE2E) &&
        new CopyWebpackPlugin({
          patterns: [
            {
              from: "./src/public",
              to: "public",
            },
          ],
        }),
      isEnvDevelopment &&
        new NodemonPlugin({
          script: path.join(outputPath, "server.roc-and-roll.js"),
          watch: outputPath,
          //  ext: '*', // extensions to watch
          ignore: ["*.js.map", path.join(outputPath, "client")],
          // Arguments to pass to the script being watched.
          args: ["--workspace", "./workspace", "--host", "0.0.0.0"],
          // Node arguments.
          // TODO: When enabling this, restarting due to code changes always
          // triggers an error that says that the debug port is already in use.
          // nodeArgs: ['--inspect'],

          nodeArgs: ["--unhandled-rejections=strict"],
        }),
    ].filter(Boolean),
    optimization: {
      minimize: isEnvProduction,
      nodeEnv: isEnvE2E ? "e2e-test" : undefined,
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js", ".jsx"],
    },
    output: {
      filename: "[name].roc-and-roll.js",
      path: outputPath,
      module: true,
      // Makes sure that the file paths generated in the .js.map file are correct.
      // To verify, throw an error in server.ts. Clicking the file path in the
      // error message should open your editor.
      devtoolModuleFilenameTemplate: "../[resource-path]",
    },
    stats: {
      assets: false,
    },
  };
};
