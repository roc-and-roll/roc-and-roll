import React from "react";
import ReactDOM from "react-dom";
import { App } from "./App";
import { StateProvider } from "./State";

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
