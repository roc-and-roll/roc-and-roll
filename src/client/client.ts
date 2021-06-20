import { render } from "./render";
import io from "socket.io-client";
import { SOCKET_IO_PATH } from "../shared/constants";

// Create a new socket, but do not connect yet
const socket = io("/", {
  path: SOCKET_IO_PATH,
  autoConnect: false,
});
// Render the app
render(socket);
// Now connect the socket
socket.connect();

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
