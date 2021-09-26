import {
  faCog,
  faCommentAlt,
  faMapSigns,
  faMusic,
  faSortNumericDown,
  faStream,
  faStreetView,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useState } from "react";
import { useIsGM, useLoginLogout } from "../../myself";
import { useServerState } from "../../state";
import { About } from "../About";
import { Acknowledgements } from "../Acknowledgements";
import { Collapsible } from "../Collapsible";
import { Compendium } from "../compendium/Compendium";
import { Dialog, DialogContent, DialogTitle } from "../Dialog";
import { Modding } from "../Modding";
import { Player } from "../Player";
import { Settings } from "../Settings";

export function Toolbar() {
  const myselfIsGM = useIsGM();
  const musicIsGMOnly = useServerState(
    (state) => state.globalSettings.musicIsGMOnly
  );

  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <div className="toolbar">
      {settingsOpen && (
        <SettingsDialog onClose={() => setSettingsOpen(false)} />
      )}
      <FontAwesomeIcon
        fixedWidth
        size="2x"
        icon={faStreetView}
        title="characters"
      />
      <FontAwesomeIcon
        fixedWidth
        size="2x"
        icon={faSortNumericDown}
        title="initiative"
      />
      {myselfIsGM && (
        <FontAwesomeIcon fixedWidth size="2x" icon={faMapSigns} title="maps" />
      )}
      {(myselfIsGM || !musicIsGMOnly) && (
        <FontAwesomeIcon fixedWidth size="2x" icon={faMusic} title="music" />
      )}
      <FontAwesomeIcon fixedWidth size="2x" icon={faStream} title="log" />
      <FontAwesomeIcon fixedWidth size="2x" icon={faCommentAlt} title="chat" />
      <FontAwesomeIcon
        fixedWidth
        size="2x"
        icon={faCog}
        title="settings"
        onClick={() => setSettingsOpen(true)}
      />
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
