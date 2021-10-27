import {
  faAward,
  faCog,
  faDiceD20,
  faMapSigns,
  faMusic,
  faPhotoVideo,
  faSortNumericDown,
  faStream,
  faStreetView,
} from "@fortawesome/free-solid-svg-icons";
import React, { useEffect, useState } from "react";
import { useIsGM, useMyProps } from "../../myself";
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
import { InitiativeTracker } from "../InitiativeTracker";
import { Log } from "../Log";
import { Maps } from "../Maps";
import { Modding } from "../Modding";
import { Music } from "../Music";
import { RRFontAwesomeIcon } from "../RRFontAwesomeIcon";
import { Settings } from "../Settings";
import { RRTooltip, RRTooltipProps } from "../RRTooltip";
import clsx from "clsx";
import { AssetLibrary } from "../assetLibrary/AssetLibrary";

const tooltipProps: RRTooltipProps = {
  placement: "right",
  offset: [0, 16],
};

export function Toolbar() {
  const myselfIsGM = useIsGM();
  const musicIsGMOnly = useServerState(
    (state) => state.globalSettings.musicIsGMOnly
  );

  const [initiativeActive, setIntiativeActive] = useLocalState(
    "initiativeActive",
    false
  );
  const [charactersActive, setCharactersActive] = useLocalState(
    "charactersActive",
    false
  );
  const [mapsActive, setMapsActive] = useLocalState("mapsActive", false);
  const [diceActive, setDiceActive] = useLocalState("diceActive", false);
  const [logActive, setLogActive] = useLocalState("logActive", false);
  const [musicActive, setMusicActive] = useLocalState("musicActive", false);
  const [assetLibraryActive, setAssetLibraryActive] = useLocalState(
    "assetLibrary",
    false
  );
  const [achievementsActive, setAchievementsActive] = useLocalState(
    "achievementsActive",
    false
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  const wrap = (el: JSX.Element) => <div className="toolbar-panel">{el}</div>;

  const initiativeTrackerVisible = useServerState(
    (state) => state.initiativeTracker.visible
  );
  const myself = useMyProps("isGM");

  useEffect(() => {
    setIntiativeActive(initiativeTrackerVisible);
  }, [initiativeTrackerVisible, setIntiativeActive]);

  return (
    <div className="toolbar-container">
      <div className="toolbar">
        {settingsOpen && (
          <SettingsDialog onClose={() => setSettingsOpen(false)} />
        )}
        <RRTooltip
          content="Characters"
          {...tooltipProps}
          disabled={charactersActive}
        >
          <RRFontAwesomeIcon
            fixedWidth
            className={charactersActive ? "active" : ""}
            onClick={() => setCharactersActive((a) => !a)}
            icon={faStreetView}
          />
        </RRTooltip>
        <RRTooltip content="Dice" {...tooltipProps} disabled={diceActive}>
          <RRFontAwesomeIcon
            fixedWidth
            className={diceActive ? "active" : ""}
            onClick={() => setDiceActive((a) => !a)}
            icon={faDiceD20}
          />
        </RRTooltip>
        {(initiativeTrackerVisible || myself.isGM) && (
          <RRTooltip
            content="Initiative"
            {...tooltipProps}
            disabled={initiativeActive}
          >
            <RRFontAwesomeIcon
              fixedWidth
              className={clsx(
                !initiativeTrackerVisible && myself.isGM ? "gm-only" : "",
                initiativeActive ? "active" : ""
              )}
              onClick={() => setIntiativeActive((a) => !a)}
              icon={faSortNumericDown}
            />
          </RRTooltip>
        )}
        {myselfIsGM && (
          <RRTooltip content="Maps" {...tooltipProps} disabled={mapsActive}>
            <RRFontAwesomeIcon
              fixedWidth
              className={clsx("gm-only", mapsActive ? "active" : "")}
              onClick={() => setMapsActive((a) => !a)}
              icon={faMapSigns}
            />
          </RRTooltip>
        )}
        {(myselfIsGM || !musicIsGMOnly) && (
          <RRTooltip content="Music" {...tooltipProps} disabled={musicActive}>
            <RRFontAwesomeIcon
              fixedWidth
              icon={faMusic}
              className={clsx(
                musicIsGMOnly ? "gm-only" : "",
                musicActive ? "active" : ""
              )}
              onClick={() => setMusicActive((a) => !a)}
            />
          </RRTooltip>
        )}
        <RRTooltip
          content="Asset Library"
          {...tooltipProps}
          disabled={musicActive}
        >
          <RRFontAwesomeIcon
            fixedWidth
            icon={faPhotoVideo}
            className={clsx(assetLibraryActive ? "active" : "")}
            onClick={() => setAssetLibraryActive((a) => !a)}
          />
        </RRTooltip>
        <RRTooltip content="Log" {...tooltipProps} disabled={logActive}>
          <RRFontAwesomeIcon
            fixedWidth
            icon={faStream}
            className={logActive ? "active" : ""}
            onClick={() => setLogActive((a) => !a)}
          />
        </RRTooltip>
        <RRTooltip
          content="Achievements"
          {...tooltipProps}
          disabled={achievementsActive}
        >
          <RRFontAwesomeIcon
            fixedWidth
            className={achievementsActive ? "active" : ""}
            onClick={() => setAchievementsActive((a) => !a)}
            icon={faAward}
          />
        </RRTooltip>
        <RRTooltip content="Settings" {...tooltipProps} disabled={settingsOpen}>
          <RRFontAwesomeIcon
            fixedWidth
            className={settingsOpen ? "active" : ""}
            icon={faCog}
            onClick={() => setSettingsOpen(true)}
          />
        </RRTooltip>
      </div>
      <div className="toolbar-tools">
        {charactersActive && wrap(<CharacterManager />)}
        {diceActive && wrap(<DicePanel />)}
        {initiativeActive && wrap(<InitiativeTracker />)}
        {mapsActive && myselfIsGM && wrap(<Maps />)}
        {musicActive &&
          (musicIsGMOnly
            ? myselfIsGM && (
                <GMArea>
                  <Music />
                </GMArea>
              )
            : wrap(<Music />))}
        {assetLibraryActive && wrap(<AssetLibrary />)}
        {logActive && wrap(<Log />)}
        {achievementsActive && wrap(<Achievements />)}
      </div>
    </div>
  );
}

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog open={true} onClose={onClose}>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <Collapsible title="User Settings" defaultCollapsed>
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
