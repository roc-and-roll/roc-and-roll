import React from "react";
import ReactDOM from "react-dom";
import { App } from "./components/App";
import { ServerStateProvider } from "./state";

export function render(socket: SocketIOClient.Socket) {
  // Create a new div element, add it to the DOM, and render our app into it.
  const root = document.createElement("div");
  document.body.appendChild(root);

  ReactDOM.render(
    // The StateProvider provides the server state to the entire app tree.
    <ServerStateProvider socket={socket}>
      <App />
    </ServerStateProvider>,
    root
  );
}
