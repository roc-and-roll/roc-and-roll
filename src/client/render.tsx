import React, { StrictMode } from "react";
import ReactDOM from "react-dom";
import { App } from "./components/App";
import { ServerStateProvider } from "./state";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

export function render(socket: SocketIOClient.Socket) {
  // Create a new div element, add it to the DOM, and render our app into it.
  const root = document.createElement("div");
  root.className = "root";
  document.body.appendChild(root);

  ReactDOM.render(
    // https://reactjs.org/docs/strict-mode.html
    <StrictMode>
      {/* The ServerStateProvider provides the server state to the entire app tree. */}
      <ServerStateProvider socket={socket}>
        <DndProvider backend={HTML5Backend}>
          <App />
        </DndProvider>
      </ServerStateProvider>
    </StrictMode>,
    root
  );
}
