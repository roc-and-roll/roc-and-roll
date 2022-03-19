import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import webpack from "webpack";
import { GitRevisionPlugin } from "git-revision-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import { CleanWebpackPlugin } from "clean-webpack-plugin";
import ReactRefreshWebpackPlugin from "@pmmmwh/react-refresh-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import WorkboxPlugin from "workbox-webpack-plugin";
import FaviconsWebpackPlugin from "favicons-webpack-plugin";
import BuildHashPlugin from "build-hash-webpack-plugin";

const FAVICONS_DIR = "assets";

const gitRevisionPlugin = new GitRevisionPlugin();

// Heroku deletes the .git folder, therefore this command fails.
// We cannot use the Dyno Metadata lab feature, because those are
// not available while building.
// https://devcenter.heroku.com/articles/dyno-metadata
// That is why we set a custom environment variable which IS available
// during build time:
// $ heroku config:set HEROKU=1
const version = process.env.HEROKU ? "main" : gitRevisionPlugin.version();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

export default (webpackEnv) => {
  const isEnvDevelopment = webpackEnv.mode === "development";
  const isEnvE2E = webpackEnv.mode === "e2e";
  const isEnvProduction = webpackEnv.mode === "production";

  if (!isEnvDevelopment && !isEnvE2E && !isEnvProduction) {
    throw new Error(
      "You must specify either '--env mode=development', '--env mode=production', or '--env mod=e2e'."
    );
  }

  const outputPath =
    isEnvProduction || isEnvE2E
      ? path.join(__dirname, "dist", webpackEnv.mode, "client")
      : undefined;

  const isCodeSpaces = !!process.env.CODESPACES;

  const DEV_SERVER_SOCK_PORT = isCodeSpaces ? 443 : 3001;

  if (isCodeSpaces) {
    console.log("Running on GitHub Codespaces.");
  }

  const postCSSLoader = {
    loader: "postcss-loader",
    options: {
      postcssOptions: {
        plugins: {
          tailwindcss: {},
          autoprefixer: {},
        },
      },
    },
  };

  const babelLoader = {
    loader: "babel-loader",
    options: {
      cacheDirectory: true,
      cacheCompression: false,
      compact: isEnvProduction,
      babelrc: false,
      plugins: [
        "@babel/plugin-syntax-dynamic-import",
        isEnvDevelopment && require.resolve("react-refresh/babel"),
      ].filter(Boolean),
      presets: [
        [
          "@babel/preset-env",
          {
            useBuiltIns: "entry",
            corejs: 3,
          },
        ],
        ["@babel/preset-react", { development: isEnvDevelopment }],
        "@babel/preset-typescript",
      ],
    },
  };

  return {
    target: "web",
    mode: isEnvProduction ? "production" : "development",
    bail: isEnvProduction || isEnvE2E,
    devtool:
      isEnvProduction || isEnvE2E
        ? "source-map"
        : isEnvDevelopment && "cheap-module-source-map",
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
      path: outputPath,
      // Add /* filename */ comments to generated require()s in the output.
      pathinfo: isEnvDevelopment || isEnvE2E,
      // There will be one main bundle, and one file per asynchronous chunk.
      // In development, it does not produce real files.
      filename:
        isEnvProduction || isEnvE2E
          ? "[name].[contenthash:8].js"
          : "[name].bundle.js",
      publicPath: "/",
      chunkFilename:
        isEnvProduction || isEnvE2E
          ? "[name].[contenthash:8].chunk.js"
          : "[name].chunk.js",
      // this defaults to 'window', but by setting it to 'this' then
      // module chunks which are built will work in web workers as well.
      globalObject: "this",
    },
    optimization: {
      minimize: isEnvProduction,
      // Keep the runtime chunk separated to enable long term caching
      // https://twitter.com/wSokra/status/969679223278505985
      // https://github.com/facebook/create-react-app/issues/5358
      runtimeChunk: {
        name: (entrypoint) => `runtime-${entrypoint.name}`,
      },
      nodeEnv: isEnvE2E ? "e2e-test" : undefined,
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js", ".jsx"],
      fallback: {
        crypto: false,
        assert: require.resolve("assert"),
      },
      alias: {
        "react-pixi-fiber": path.resolve(
          __dirname,
          "src/client/third-party/react-pixi-fiber/src"
        ),
      },
    },
    plugins: [
      new BuildHashPlugin(),
      new HtmlWebpackPlugin({
        title: "Roc & Roll",
        meta: {
          viewport: "width=device-width, initial-scale=1",
        },
        ...(isEnvProduction
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
          : undefined),
      }),
      (isEnvProduction || isEnvE2E) &&
        new WorkboxPlugin.GenerateSW({
          clientsClaim: true,
          skipWaiting: true,

          cacheId: "roc-and-roll",
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^api\//],

          // Do not cache assets generated by the favicons plugin.
          exclude: [new RegExp(`^${FAVICONS_DIR}/.*$`)],
        }),
      new FaviconsWebpackPlugin({
        logo: "./logo.png",
        prefix: FAVICONS_DIR + "/",
        cache: true,
        favicons: {
          appName: "Roc & Roll",
          appShortName: "Roc & Roll",
          appDescription: "A virtual tabletop for roleplaying games.",
          developerName: null,
          developerURL: null,
          dir: "auto",
          lang: "en-US",
          background: "#FFFFFF",
          theme_color: "#145CBF", // TODO: This is a random blueish color
          appleStatusBarStyle: "black-translucent",
          display: "standalone",
          orientation: "any",
          scope: "/",
          start_url: "/",
          version: version,
          logging: true,
          pixel_art: false,
          loadManifestWithCredentials: false,
          // TODO: Not sure about this, revisit one we have proper icons.
          manifestMaskable: false,
        },
      }),
      new webpack.DefinePlugin({
        __VERSION__: JSON.stringify(version),
      }),
      new webpack.ProvidePlugin({
        // https://github.com/browserify/node-util/issues/57
        //
        // Make a global `process` variable that points to the `process` package,
        // because the `util` package expects there to be a global variable named `process`.
        // Thanks to https://stackoverflow.com/a/65018686/14239942
        process: "process/browser",
      }),
      isEnvDevelopment &&
        new ReactRefreshWebpackPlugin({
          overlay: {
            sockPort: DEV_SERVER_SOCK_PORT,
          },
        }),
      new MiniCssExtractPlugin({
        filename:
          isEnvProduction || isEnvE2E
            ? "[name].[contenthash:8].css"
            : "[name].css",
      }),
      (isEnvProduction || isEnvE2E) && new CleanWebpackPlugin(),
    ].filter(Boolean),
    module: {
      rules: [
        {
          test: /\.css$/i,
          use: [MiniCssExtractPlugin.loader, "css-loader", postCSSLoader],
        },
        {
          test: /\.(s[ac])ss$/i,
          use: [
            MiniCssExtractPlugin.loader,
            "css-loader",
            postCSSLoader,
            // Compiles Sass to CSS
            "sass-loader",
          ],
        },
        {
          test: /\.(eot|ttf|woff|woff2|mp3|svg|png|jpg|jpeg|glb)$/,
          type: "asset",
        },
        {
          test: /LICENSE\.md$/,
          type: "asset/source",
        },
        {
          test: /\.peggy$/,
          include: path.resolve("src"),
          use: [
            babelLoader,
            {
              loader: "@rocket.chat/peggy-loader",
              options: {},
            },
          ],
        },
        {
          test: /\.(js|ts)x?$/,
          include: path.resolve("src"),
          use: [babelLoader],
        },
      ],
    },
    devServer: isEnvDevelopment
      ? {
          hot: true,
          host: "0.0.0.0",
          port: 3001,
          allowedHosts: "all",
          historyApiFallback: {
            // Paths with dots should still use the history fallback.
            // See https://github.com/facebook/create-react-app/issues/387.
            disableDotRule: true,
          },
          client: {
            // Silence WebpackDevServer's own logs since they're generally not useful.
            // It will still show compile warnings and errors with this setting.
            logging: "none",
            overlay: true,
            progress: true,
            webSocketURL: {
              port: DEV_SERVER_SOCK_PORT,
            },
          },
          static: {
            directory: path.join(__dirname, "src", "public"),
            watch: true,
          },
          proxy: {
            context: "/api",
            target: "http://localhost:3000",
            ws: true,
            logLevel: "silent",
          },
        }
      : undefined,
  };
};
