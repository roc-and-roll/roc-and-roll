// begin alpha react types
import type {} from "react-dom/next";
import type {} from "react/next";
// end alpha react types
import React, { StrictMode } from "react";
import ReactDOM from "react-dom";
import { App } from "./components/App";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { SettingsProvider } from "./settings";
import { RecoilRoot } from "recoil";
import { USE_CONCURRENT_MODE } from "../shared/constants";
import { MyselfProvider } from "./myself";
import { CompendiumProvider } from "./components/compendium/Compendium";
import { ModApi } from "./components/Modding";
import { ServerMessagesProvider } from "./serverMessages";
import { CampaignAndServerStateProvider } from "./campaign";
import { DialogBoxes } from "./dialog-boxes";

export function render() {
  // Create a new div element, add it to the DOM, and render our app into it.
  const container = document.createElement("div");
  container.className = "root";
  document.body.appendChild(container);

  const element = <Root />;
  if (USE_CONCURRENT_MODE) {
    ReactDOM.createRoot(container).render(element);
  } else {
    ReactDOM.render(element, container);
  }
}

function Root() {
  // https://reactjs.org/docs/strict-mode.html
  return (
    <StrictMode>
      <RecoilRoot>
        <CampaignAndServerStateProvider>
          <SettingsProvider>
            <ServerMessagesProvider>
              <MyselfProvider>
                <CompendiumProvider>
                  <DndProvider backend={HTML5Backend}>
                    <ModApi />
                    <App />
                    <DialogBoxes />
                  </DndProvider>
                </CompendiumProvider>
              </MyselfProvider>
            </ServerMessagesProvider>
          </SettingsProvider>
        </CampaignAndServerStateProvider>
      </RecoilRoot>
    </StrictMode>
  );
}
