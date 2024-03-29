import {
  faAward,
  faBug,
  faChevronDown,
  faChevronUp,
  faCloud,
  faCog,
  faMapSigns,
  faMusic,
  faPhotoVideo,
  faShoppingBag,
  faStreetView,
  faSearch,
  IconDefinition,
  faDiceD20,
  faCubes,
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
import { Atmosphere } from "../map/atmosphere/Atmosphere";
import QuickReference from "../quickReference/QuickReference";
import { useRRSettings } from "../../settings";
import { DicePanel } from "../diceTemplates/DicePanel";
import { BetterDice } from "../betterDice/BetterDice";
import { Inventories } from "../inventory/Inventories";

const tooltipProps: Partial<RRTooltipProps> = {
  placement: "right",
  offset: [0, 16],
};

interface ToolbarElement {
  id: string;
  content: React.ReactElement;
  large?: boolean;
  collapsed: boolean;
  gmOnly: boolean;
  icon: IconDefinition;
  iconTooltip: string;
  iconClassName?: string;
  hidePanel?: boolean;
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

  const [{ betterDice }] = useRRSettings();

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
      hidePanel: true,
    },
    {
      id: "quickReference",
      collapsed: true,
      content: (
        <QuickReference
          onClose={() =>
            setActiveToolbarElements((activeToolbarElements) =>
              activeToolbarElements.filter((id) => id !== "quickReference")
            )
          }
        />
      ),
      gmOnly: false,
      icon: faSearch,
      iconTooltip: "Quick Reference",
      hidePanel: true,
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
      id: "atmosphere",
      collapsed: true,
      content: <Atmosphere />,
      gmOnly: false,
      icon: faCloud,
      iconTooltip: "Atmosphere",
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
      id: "inventories",
      collapsed: false,
      content: <Inventories />,
      gmOnly: false,
      icon: faShoppingBag,
      iconTooltip: "Inventory",
    },
    {
      id: "characters",
      collapsed: !myself.isGM,
      content: <CharacterManager />,
      gmOnly: false,
      icon: faStreetView,
      iconTooltip: "Characters",
    },
    ...(betterDice
      ? [
          {
            id: "diceRolling",
            collapsed: false,
            content: <DicePanel />,
            gmOnly: false,
            icon: faDiceD20,
            iconTooltip: "Dice Rolling",
          },
          {
            id: "betterDice",
            collapsed: false,
            content: <BetterDice />,
            gmOnly: false,
            icon: faCubes,
            large: true,
            iconTooltip: "Dice Templates",
          },
        ]
      : []),
  ];

  // Disable pointer events on the wrapper div - otherwise you cannot interact
  // with the map, even if the entire toolbar is collapsed. Make sure to
  // re-enable pointer events on all children.
  return (
    <div
      className={clsx(
        "pointer-events-none absolute left-2 flex items-end h-[calc(100%-6rem)] z-10",
        betterDice ? "bottom-2" : "bottom-14"
      )}
    >
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
      <div className={clsx("pointer-events-auto overflow-y-auto max-h-full")}>
        {toolbarElements.map(
          (toolbarElement) =>
            (!collapsed || !toolbarElement.collapsed) &&
            activeToolbarElements.includes(toolbarElement.id) &&
            (!toolbarElement.gmOnly || myself.isGM) && (
              <div
                key={toolbarElement.id}
                className={clsx(
                  "last:mb-0 hud-panel m-2",
                  {
                    "p-3": !toolbarElement.hidePanel,
                  },

                  toolbarElement.large ? "w-[800px]" : "w-[420px]"
                )}
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
