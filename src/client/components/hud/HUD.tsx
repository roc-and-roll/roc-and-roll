import React, { Suspense } from "react";
import { CharacterHUD } from "./characterHud/Character";
import { LogHUD } from "./Log";
import { InitiativeHUD } from "./Initiative";
import { HUDToolbar } from "./Toolbar";
import { RRColor } from "../../../shared/state";
import { ActionsHUD } from "./Actions";
import { useRRSettings } from "../../settings";

export const HUD = React.memo(function HUD({
  mapBackgroundColor,
}: {
  mapBackgroundColor: RRColor;
}) {
  const [{ betterDice }] = useRRSettings();
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
      <Suspense fallback={null}>{!betterDice && <ActionsHUD />}</Suspense>
    </>
  );
});
