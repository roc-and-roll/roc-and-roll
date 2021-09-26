import {
  faAward,
  faCog,
  faDiceD20,
  faMapSigns,
  faMusic,
  faSortNumericDown,
  faStream,
  faStreetView,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useState } from "react";
import { useIsGM, useLoginLogout, useMyself } from "../../myself";
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
import { Player } from "../Player";
import { Settings } from "../Settings";

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
  const [achievementsActive, setAchievementsActive] = useLocalState(
    "achievementsActive",
    false
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  const wrap = (el: JSX.Element) => <div className="toolbar-panel">{el}</div>;

  const initiativeTracker = useServerState((state) => state.initiativeTracker);
  const myself = useMyself();

  useEffect(() => {
    setIntiativeActive(initiativeTracker.visible);
  }, [initiativeTracker.visible, setIntiativeActive]);

  return (
    <div className="toolbar-container">
      <div className="toolbar">
        {settingsOpen && (
          <SettingsDialog onClose={() => setSettingsOpen(false)} />
        )}
        <FontAwesomeIcon
          fixedWidth
          size="2x"
          className={charactersActive ? "active" : ""}
          onClick={() => setCharactersActive((a) => !a)}
          icon={faStreetView}
          title="characters"
        />
        <FontAwesomeIcon
          fixedWidth
          size="2x"
          className={diceActive ? "active" : ""}
          onClick={() => setDiceActive((a) => !a)}
          icon={faDiceD20}
          title="dice"
        />
        {(initiativeTracker.visible || myself.isGM) && (
          <FontAwesomeIcon
            fixedWidth
            size="2x"
            className={initiativeActive ? "active" : ""}
            onClick={() => setIntiativeActive((a) => !a)}
            icon={faSortNumericDown}
            title="initiative"
          />
        )}
        {myselfIsGM && (
          <FontAwesomeIcon
            fixedWidth
            size="2x"
            className={mapsActive ? "active" : ""}
            onClick={() => setMapsActive((a) => !a)}
            icon={faMapSigns}
            title="maps"
          />
        )}
        {(myselfIsGM || !musicIsGMOnly) && (
          <FontAwesomeIcon
            fixedWidth
            size="2x"
            icon={faMusic}
            title="music"
            className={musicActive ? "active" : ""}
            onClick={() => setMusicActive((a) => !a)}
          />
        )}
        <FontAwesomeIcon
          fixedWidth
          size="2x"
          icon={faStream}
          title="log"
          className={logActive ? "active" : ""}
          onClick={() => setLogActive((a) => !a)}
        />
        <FontAwesomeIcon
          fixedWidth
          size="2x"
          className={achievementsActive ? "active" : ""}
          onClick={() => setAchievementsActive((a) => !a)}
          icon={faAward}
          title="achievements"
        />
        <FontAwesomeIcon
          fixedWidth
          size="2x"
          icon={faCog}
          title="settings"
          onClick={() => setSettingsOpen(true)}
        />
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
        {logActive && wrap(<Log />)}
        {achievementsActive && wrap(<Achievements />)}
      </div>
    </div>
  );
}

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { logout } = useLoginLogout();
  return (
    <Dialog open={true} onClose={onClose}>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <Collapsible title="Player" defaultCollapsed>
          <Player logout={logout} />
        </Collapsible>

        <Collapsible title="Compendium" defaultCollapsed>
          <Compendium />
        </Collapsible>

        <Collapsible title="Settings" defaultCollapsed>
          <Settings />
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
