import {
  faAward,
  faChevronDown,
  faChevronUp,
  faCog,
  faDiceD20,
  faMapSigns,
  faMusic,
  faPhotoVideo,
  faStreetView,
  IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import React, { useState } from "react";
import { useMyProps } from "../../myself";
import { useServerState } from "../../state";
import useLocalState from "../../useLocalState";
import { About } from "../About";
import { Achievements } from "../Achievements";
import { Acknowledgements } from "../Acknowledgements";
import { CharacterManager } from "../characters/CharacterManager";
import { Collapsible } from "../Collapsible";
import { Compendium } from "../compendium/Compendium";
import { Dialog, DialogContent, DialogTitle } from "../Dialog";
import { DicePanel } from "../DicePanel";
import { GMArea } from "../GMArea";
import { Maps } from "../Maps";
import { Modding } from "../Modding";
import { Music } from "../Music";
import { RRFontAwesomeIcon } from "../RRFontAwesomeIcon";
import { Settings } from "../Settings";
import { RRTooltip, RRTooltipProps } from "../RRTooltip";
import { AssetLibrary } from "../assetLibrary/AssetLibrary";
import { Player } from "../Player";

const tooltipProps: RRTooltipProps = {
  placement: "right",
  offset: [0, 16],
};

type ToolbarElement = {
  id: string;
  content: React.ReactElement;
  collapsed: boolean;
  gmOnly: boolean;
  icon: IconDefinition;
  iconTooltip: string;
};

export const HUDToolbar = React.memo(function Toolbar() {
  const myself = useMyProps("isGM");
  const musicIsGMOnly = useServerState(
    (state) => state.globalSettings.musicIsGMOnly
  );
  const [collapsed, setCollapsed] = useState(true);
  const [activeToolbarElements, setActiveToolbarElements] = useLocalState<
    string[]
  >("activeToolbarElements", []);

  const toolbarElements: ToolbarElement[] = [
    {
      id: "settings",
      collapsed: true,
      content: (
        <SettingsDialog
          onClose={() =>
            setActiveToolbarElements((activeToolbarElements) =>
              activeToolbarElements.filter((id) => id !== "settings")
            )
          }
        />
      ),
      gmOnly: false,
      icon: faCog,
      iconTooltip: "Settings",
    },
    {
      id: "achievements",
      collapsed: true,
      content: <Achievements />,
      gmOnly: false,
      icon: faAward,
      iconTooltip: "Achievements",
    },
    {
      id: "assetLibrary",
      collapsed: true,
      content: <AssetLibrary />,
      gmOnly: false,
      icon: faPhotoVideo,
      iconTooltip: "Asset Library",
    },
    {
      id: "maps",
      collapsed: true,
      content: <Maps />,
      gmOnly: true,
      icon: faMapSigns,
      iconTooltip: "Maps",
    },
    {
      id: "music",
      collapsed: true,
      content: musicIsGMOnly ? (
        <GMArea>
          <Music />
        </GMArea>
      ) : (
        <Music />
      ),
      gmOnly: musicIsGMOnly,
      icon: faMusic,
      iconTooltip: "Music",
    },
    {
      id: "characters",
      collapsed: !myself.isGM,
      content: <CharacterManager />,
      gmOnly: false,
      icon: faStreetView,
      iconTooltip: "Characters",
    },
    {
      id: "dice",
      collapsed: false,
      content: <DicePanel />,
      gmOnly: false,
      icon: faDiceD20,
      iconTooltip: "Dice Rolling",
    },
  ];

  return (
    <div className="toolbar-container absolute bottom-2 left-2">
      <div className="toolbar">
        <RRTooltip
          content={collapsed ? "show more" : "show less"}
          {...tooltipProps}
        >
          <RRFontAwesomeIcon
            fixedWidth
            onClick={() => setCollapsed((collapsed) => !collapsed)}
            icon={collapsed ? faChevronUp : faChevronDown}
          />
        </RRTooltip>
        {toolbarElements.map((toolbarElement) => {
          return (
            (!collapsed || !toolbarElement.collapsed) &&
            (!toolbarElement.gmOnly || myself.isGM) && (
              <RRTooltip
                key={toolbarElement.id}
                content={toolbarElement.iconTooltip}
                {...tooltipProps}
                disabled={activeToolbarElements.includes(toolbarElement.id)}
              >
                <RRFontAwesomeIcon
                  fixedWidth
                  className={
                    activeToolbarElements.includes(toolbarElement.id)
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setActiveToolbarElements((activeToolbarElements) =>
                      activeToolbarElements.includes(toolbarElement.id)
                        ? activeToolbarElements.filter(
                            (id) => id !== toolbarElement.id
                          )
                        : [...activeToolbarElements, toolbarElement.id]
                    )
                  }
                  icon={toolbarElement.icon}
                />
              </RRTooltip>
            )
          );
        })}
      </div>
      <div className="toolbar-tools">
        {toolbarElements.map(
          (toolbarElement) =>
            (!collapsed || !toolbarElement.collapsed) &&
            activeToolbarElements.includes(toolbarElement.id) &&
            (!toolbarElement.gmOnly || myself.isGM) && (
              <div key={toolbarElement.id} className="toolbar-panel bg-rr-800">
                {toolbarElement.content}
              </div>
            )
        )}
      </div>
    </div>
  );
});

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog open={true} onClose={onClose}>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <Collapsible title="User Settings" defaultCollapsed>
          <Player />
          <Settings />
        </Collapsible>

        <Collapsible title="Compendium" defaultCollapsed>
          <Compendium />
        </Collapsible>

        <Collapsible title="Modding" defaultCollapsed>
          <Modding />
        </Collapsible>

        <Collapsible title="Acknowledgements" defaultCollapsed>
          <Acknowledgements />
        </Collapsible>

        <Collapsible title="About" defaultCollapsed>
          <About />
        </Collapsible>
      </DialogContent>
    </Dialog>
  );
}
