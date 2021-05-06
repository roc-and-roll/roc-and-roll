import React from "react";
import { DiceInput } from "./DiceInput";
import { TokenManager } from "./TokenManager";
import { Collapsible } from "./Collapsible";
import { Playground } from "./Playground";
import { Resizable } from "re-resizable";
import useLocalState from "../useLocalState";
import { Player } from "./Player";
import { InitiativeTracker } from "./InitiativeTracker";
import { Acknowledgements } from "./Acknowledgements";
import { Settings } from "./Settings";
import { Players } from "./Players";
import { About } from "./About";
import { useMyself } from "../myself";
import { Maps } from "./Maps";
import { Achievements } from "./Achievements";
import { Music } from "./Music";

export function Sidebar({ logout }: { logout: () => void }) {
  const [sidebarWidth, setSidebarWidth] = useLocalState("sidebarWidth", 450);
  const myself = useMyself();

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
    >
      <div className="app-sidebar-scroll-container">
        <h1>Roc & Roll</h1>

        <Collapsible title="Initiative">
          <InitiativeTracker />
        </Collapsible>
        <Collapsible title="Tokens">
          <TokenManager />
        </Collapsible>

        <Collapsible title="Dice">
          <DiceInput />
        </Collapsible>

        {myself.isGM && (
          <Collapsible title="Maps">
            <Maps />
          </Collapsible>
        )}

        <Collapsible title="Player">
          <Player logout={logout} />
        </Collapsible>

        <Collapsible title="Players">
          <Players />
        </Collapsible>

        <Collapsible title="Music" defaultCollapsed>
          <Music />
        </Collapsible>

        <Collapsible title="Achievements" defaultCollapsed>
          <Achievements />
        </Collapsible>

        <Collapsible title="Settings">
          <Settings />
        </Collapsible>

        <Collapsible title="Acknowledgements" defaultCollapsed={true}>
          <Acknowledgements />
        </Collapsible>

        <Collapsible title="About" defaultCollapsed={true}>
          <About />
        </Collapsible>

        {process.env.NODE_ENV === "development" && <Playground />}
      </div>
    </Resizable>
  );
}
