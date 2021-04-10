import React from "react";
import ReactDOM from "react-dom";
import { App } from "./components/App";
import { StateProvider } from "./state";

export function render(socket: SocketIOClient.Socket) {
  const root = document.createElement("div");
  document.body.appendChild(root);

  ReactDOM.render(
    <StateProvider socket={socket}>
      <App />
    </StateProvider>,
    root
  );
}
