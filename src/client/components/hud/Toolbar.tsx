import {
  faAward,
  faBug,
  faChevronDown,
  faChevronUp,
  faCog,
  faMapSigns,
  faMusic,
  faPhotoVideo,
  faStreetView,
  IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import React from "react";
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
import { GMArea } from "../GMArea";
import { Maps } from "../Maps";
import { Modding } from "../Modding";
import { Music } from "../Music";
import { RRFontAwesomeIcon } from "../RRFontAwesomeIcon";
import { Settings } from "../Settings";
import { RRTooltip, RRTooltipProps } from "../RRTooltip";
import { AssetLibrary } from "../assetLibrary/AssetLibrary";
import { Player } from "../Player";
import { DebugSettings } from "./DebugSettings";
import clsx from "clsx";

const tooltipProps: Partial<RRTooltipProps> = {
  placement: "right",
  offset: [0, 16],
};

interface ToolbarElement {
  id: string;
  content: React.ReactElement;
  collapsed: boolean;
  gmOnly: boolean;
  icon: IconDefinition;
  iconTooltip: string;
  iconClassName?: string;
}

const getIconClass = (active: boolean) =>
  clsx("block m-[5px] p-[10px] text-[38px] cursor-pointer rounded-full ", {
    "hover:bg-rr-900": !active,
    "bg-yellow-500 hover:!bg-yellow-600": active,
  });

export const HUDToolbar = React.memo(function Toolbar() {
  const myself = useMyProps("isGM");
  const musicIsGMOnly = useServerState(
    (state) => state.globalSettings.musicIsGMOnly
  );
  const [collapsed, setCollapsed] = useLocalState("toolbarCollapsed", true);
  const [activeToolbarElements, setActiveToolbarElements] = useLocalState<
    string[]
  >("activeToolbarElements", []);

  const toolbarElements: ToolbarElement[] = [
    ...(process.env.NODE_ENV === "development"
      ? [
          {
            id: "debug",
            collapsed: false,
            content: <DebugSettings />,
            gmOnly: false,
            icon: faBug,
            iconTooltip: "Debug",
            iconClassName: "border-2 border-red-500",
          },
        ]
      : []),
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
  ];

  // Disable pointer events on the wrapper div - otherwise you cannot interact
  // with the map, even if the entire toolbar is collapsed. Make sure to
  // re-enable pointer events on all children.
  return (
    <div className="pointer-events-none absolute bottom-14 left-2 flex items-end h-[calc(100%-6rem)] z-10">
      <div className="pointer-events-auto flex flex-col hud-panel">
        <RRTooltip
          content={collapsed ? "show more" : "show less"}
          {...tooltipProps}
        >
          <RRFontAwesomeIcon
            fixedWidth
            className={getIconClass(false)}
            onClick={() => setCollapsed((collapsed) => !collapsed)}
            icon={collapsed ? faChevronUp : faChevronDown}
          />
        </RRTooltip>
        {toolbarElements.map((toolbarElement) => {
          const active = activeToolbarElements.includes(toolbarElement.id);
          return (
            (!collapsed || !toolbarElement.collapsed) &&
            (!toolbarElement.gmOnly || myself.isGM) && (
              <RRTooltip
                key={toolbarElement.id}
                content={toolbarElement.iconTooltip}
                {...tooltipProps}
                disabled={active}
              >
                <RRFontAwesomeIcon
                  fixedWidth
                  className={clsx(
                    getIconClass(active),
                    {
                      "border-2 border-purple-600": toolbarElement.gmOnly,
                    },
                    toolbarElement.iconClassName
                  )}
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
      <div className="pointer-events-auto w-[420px] overflow-y-auto max-h-full">
        {toolbarElements.map(
          (toolbarElement) =>
            (!collapsed || !toolbarElement.collapsed) &&
            activeToolbarElements.includes(toolbarElement.id) &&
            (!toolbarElement.gmOnly || myself.isGM) && (
              <div
                key={toolbarElement.id}
                className="toolbar-panel m-2 last:mb-0 p-3 hud-panel"
              >
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
