import { render } from "./render";
import { apiHost } from "./util";
import io from "socket.io-client";

// Create a new socket, but do not connect yet
const socket = io(apiHost(), { autoConnect: false });
// Render the app
render(socket);
// Now connect the socket
socket.connect();
