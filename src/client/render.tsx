// begin experimental react types
import type {} from "react-dom/experimental";
import type {} from "react/experimental";
// end experimental react types
import React, { StrictMode } from "react";
import ReactDOM from "react-dom";
import { App } from "./components/App";
import { ServerStateProvider } from "./state";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { SettingsProvider } from "./settings";
import { RecoilRoot } from "recoil";
import { USE_CONCURRENT_MODE } from "../shared/constants";
import { MyselfProvider } from "./myself";

export function render(socket: SocketIOClient.Socket) {
  // Create a new div element, add it to the DOM, and render our app into it.
  const container = document.createElement("div");
  container.className = "root";
  document.body.appendChild(container);

  const element = <Root socket={socket} />;
  if (USE_CONCURRENT_MODE) {
    ReactDOM.unstable_createRoot(container).render(element);
  } else {
    ReactDOM.render(element, container);
  }
}

function Root({ socket }: { socket: SocketIOClient.Socket }) {
  // https://reactjs.org/docs/strict-mode.html
  return (
    <StrictMode>
      <RecoilRoot>
        <SettingsProvider>
          <ServerStateProvider socket={socket}>
            <MyselfProvider>
              <DndProvider backend={HTML5Backend}>
                <App />
              </DndProvider>
            </MyselfProvider>
          </ServerStateProvider>
        </SettingsProvider>
      </RecoilRoot>
    </StrictMode>
  );
}
