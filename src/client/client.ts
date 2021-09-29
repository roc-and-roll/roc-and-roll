import { render } from "./render";

render();

// Clear browser console on hot reload. This helps with the performance of the
// console, which can become very slow when many messages accumulate over time.
// https://github.com/webpack/webpack-dev-server/issues/565#issuecomment-449979431
if (module.hot) {
  module.hot.addStatusHandler((status) => {
    if (status === "prepare") {
      console.clear();
      console.log(
        "Console has been cleared due to hot reload. To adjust this behavior, see src/client/client.ts"
      );
    }
  });
}
