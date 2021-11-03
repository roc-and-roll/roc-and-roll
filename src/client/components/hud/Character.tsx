import React, { useState } from "react";
import { RRCharacter } from "../../../shared/state";
import { useMyProps } from "../../myself";
import { useServerState } from "../../state";
import { CharacterPreview } from "../characters/CharacterPreview";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog, faShieldAlt } from "@fortawesome/free-solid-svg-icons";
import { SettingsDialog } from "./Toolbar";
import { HPInlineEdit } from "../map/HPInlineEdit";
import { useSmartChangeHP } from "../../../client/util";

export function CharacterHUD() {
  const myself = useMyProps("mainCharacterId", "isGM");

  const character = useServerState((state) =>
    myself.mainCharacterId
      ? state.characters.entities[myself.mainCharacterId] ?? null
      : null
  );

  if (!character) return null;

  return (
    <div className="absolute top-0 right-0">
      <div className="flex m-2">
        <HealthBar character={character} isGM={myself.isGM} />
        <CurrentCharacter character={character} />
      </div>
      <div className="flex justify-end">
        <AC character={character} />
      </div>
    </div>
  );
}

function AC({ character }: { character: RRCharacter }) {
  return (
    <div className="relative">
      <FontAwesomeIcon
        icon={faShieldAlt}
        className="text-white text-7xl opacity-70 absolute right-2"
      />
      <p className="text-4xl text-gray-800 font-bold absolute right-6 top-3">
        22
      </p>
    </div>
  );
}

function CurrentCharacter({ character }: { character: RRCharacter }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <div>
      {settingsOpen && (
        <SettingsDialog onClose={() => setSettingsOpen(false)} />
      )}
      <div className="relative">
        <CharacterPreview character={character} size={128} />
        <div
          className="bg-gray-900 rounded-full p-2 absolute top-0 right-0 text-lg"
          onClick={() => setSettingsOpen(true)}
        >
          <FontAwesomeIcon icon={faCog} className="" />
        </div>
      </div>
    </div>
  );
}

function HealthBar({
  character,
  isGM,
}: {
  character: RRCharacter;
  isGM: boolean;
}) {
  const healthPercentage = (character.hp / character.maxHP) * 100;

  const setHP = useSmartChangeHP(isGM);

  return (
    <div
      className="flex h-8 rounded-md overflow-hidden bg-red-800"
      style={{ width: "200px" }}
    >
      <HPInlineEdit
        hp={character.hp + character.temporaryHP}
        setHP={(total) => setHP(character.id, total)}
      />
      <div
        className="bg-red-600 "
        style={{ width: `${healthPercentage}%` }}
      ></div>
    </div>
  );
}