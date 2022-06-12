import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./components/App";
import { ServerStateProvider } from "./state";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { SettingsProvider } from "./settings";
import { RecoilRoot } from "recoil";
import { MyselfProvider } from "./myself";
import { CompendiumProvider } from "./components/compendium/Compendium";
import { ModApi } from "./components/Modding";
import { ServerMessagesProvider } from "./serverMessages";
import { Socket } from "socket.io-client";
import { DialogBoxes, DialogProvider } from "./dialog-boxes";
import { DebugSettingsContextProvider } from "./components/hud/DebugSettings";
import { QuickReferenceProvider } from "./components/quickReference/QuickReferenceWrapper";

export function render(socket: Socket) {
  // Create a new div element, add it to the DOM, and render our app into it.
  const container = document.createElement("div");
  container.className = "root";
  document.body.appendChild(container);

  ReactDOM.createRoot(container).render(<Root socket={socket} />);
}

function Root({ socket }: { socket: Socket }) {
  // TODO(pixi): Re-enable <StrictMode>
  // https://reactjs.org/docs/strict-mode.html
  return (
    <RecoilRoot>
      <DialogProvider>
        <DebugSettingsContextProvider>
          <SettingsProvider>
            <ServerStateProvider socket={socket}>
              <ServerMessagesProvider socket={socket}>
                <MyselfProvider>
                  <CompendiumProvider>
                    <QuickReferenceProvider>
                      <DndProvider backend={HTML5Backend}>
                        <ModApi />
                        <App />
                        <DialogBoxes />
                      </DndProvider>
                    </QuickReferenceProvider>
                  </CompendiumProvider>
                </MyselfProvider>
              </ServerMessagesProvider>
            </ServerStateProvider>
          </SettingsProvider>
        </DebugSettingsContextProvider>
      </DialogProvider>
    </RecoilRoot>
  );
}
