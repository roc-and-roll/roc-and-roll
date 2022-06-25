import React, { Suspense } from "react";
import { CharacterHUD } from "./characterHud/Character";
import { LogHUD } from "./Log";
import { InitiativeHUD } from "./Initiative";
import { HUDToolbar } from "./Toolbar";
import { RRColor } from "../../../shared/state";
import { ActionsHUD } from "./Actions";

export const HUD = React.memo(function HUD({
  mapBackgroundColor,
}: {
  mapBackgroundColor: RRColor;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <HUDToolbar />
      </Suspense>
      <Suspense fallback={null}>
        <InitiativeHUD />
      </Suspense>
      <Suspense fallback={null}>
        <CharacterHUD />
      </Suspense>
      <Suspense fallback={null}>
        <LogHUD mapBackgroundColor={mapBackgroundColor} />
      </Suspense>
      <Suspense fallback={null}>
        <ActionsHUD />
      </Suspense>
    </>
  );
});
