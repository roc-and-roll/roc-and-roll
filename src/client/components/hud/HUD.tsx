import React from "react";
import { CharacterHUD } from "./Character";
import { LogHUD } from "./Log";
import { InitiativeHUD } from "./Initiative";
import { HUDToolbar } from "./Toolbar";
import { RRColor } from "../../../shared/state";
import { ActionsHUD } from "./Actions";

export function HUD({ mapBackgroundColor }: { mapBackgroundColor: RRColor }) {
  return (
    <>
      <HUDToolbar />
      <InitiativeHUD />
      <CharacterHUD />
      <LogHUD mapBackgroundColor={mapBackgroundColor} />
      <ActionsHUD />
    </>
  );
}
