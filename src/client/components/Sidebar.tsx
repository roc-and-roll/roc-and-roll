import React from "react";
import { DiceInterface } from "./DiceInterface";
import { CharacterManager } from "./characters/CharacterManager";
import { Collapsible } from "./Collapsible";
import { Resizable } from "re-resizable";
import useLocalState from "../useLocalState";
import { Player } from "./Player";
import { InitiativeTracker } from "./InitiativeTracker";
import { Acknowledgements } from "./Acknowledgements";
import { Settings } from "./Settings";
import { Players } from "./Players";
import { About } from "./About";
import { useIsGM } from "../myself";
import { Maps } from "./Maps";
import { Achievements } from "./Achievements";
import { Music } from "./Music";
import { DiceInput } from "./DiceInput";
import { GMArea } from "./GMArea";
import { useServerState } from "../state";
import { Modding } from "./Modding";
import { Compendium } from "./compendium/Compendium";
import { DiceTemplates } from "./DiceTemplates";
import { DicePanel } from "./DicePanel";

export function Sidebar({ logout }: { logout: () => void }) {
  const [sidebarWidth, setSidebarWidth] = useLocalState("sidebarWidth", 450);
  const myselfIsGM = useIsGM();
  const musicIsGMOnly = useServerState(
    (state) => state.globalSettings.musicIsGMOnly
  );

  return (
    <Resizable
      size={{ width: sidebarWidth, height: "100%" }}
      onResizeStop={(_1, _2, _3, sizeDelta) =>
        setSidebarWidth((width) => width + sizeDelta.width)
      }
      minWidth="10vw"
      maxWidth="90vw"
      bounds="parent"
      enable={{
        top: false,
        right: true,
        bottom: false,
        left: false,
        topRight: false,
        bottomRight: false,
        bottomLeft: false,
        topLeft: false,
      }}
      className="app-sidebar"
      handleClasses={{ right: "resize-handle" }}
    >
      <div className="app-sidebar-scroll-container">
        <h1>Roc & Roll</h1>

        <InitiativeTracker />
        <Collapsible title="Characters">
          <CharacterManager />
        </Collapsible>

        <Collapsible title="Dice">
          <DicePanel />
        </Collapsible>

        {myselfIsGM && (
          <Collapsible title="Maps" defaultCollapsed>
            <Maps />
          </Collapsible>
        )}

        {/* <Collapsible title="Players" defaultCollapsed>
          <Players />
        </Collapsible> */}

        <Collapsible title="Music" defaultCollapsed>
          {musicIsGMOnly ? (
            myselfIsGM && (
              <GMArea>
                <Music />
              </GMArea>
            )
          ) : (
            <Music />
          )}
        </Collapsible>

        <Collapsible title="Achievements" defaultCollapsed>
          <Achievements />
        </Collapsible>
      </div>
    </Resizable>
  );
}
