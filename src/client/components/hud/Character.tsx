import React, { useState } from "react";
import { RRCharacter } from "../../../shared/state";
import { useMyProps, useMySelectedTokens } from "../../myself";
import { useServerDispatch, useServerState } from "../../state";
import { CharacterPreview } from "../characters/CharacterPreview";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCog,
  faDragon,
  faShieldAlt,
  faUserCircle,
} from "@fortawesome/free-solid-svg-icons";
import { SettingsDialog } from "./Toolbar";
import { HPInlineEdit } from "../map/HPInlineEdit";
import { useSmartChangeHP } from "../../../client/util";
import { RRFontAwesomeIcon } from "../RRFontAwesomeIcon";
import { playerUpdate } from "../../../shared/actions";

export function CharacterHUD() {
  const myself = useMyProps("mainCharacterId", "isGM");

  const selectedCharacter = useMySelectedTokens();
  const mainCharacter = useServerState((state) =>
    myself.mainCharacterId
      ? state.characters.entities[myself.mainCharacterId] ?? null
      : null
  );

  const character =
    selectedCharacter.length > 0 ? selectedCharacter[0]! : mainCharacter;

  return (
    <div className="absolute top-0 right-0">
      <div className="flex m-2">
        {character && <HealthBar character={character} isGM={myself.isGM} />}
        <div className="flex flex-col justify-center items-center">
          <CurrentCharacter character={character} />
          {character && <AC character={character} />}
          {<HeroPoint />}
        </div>
      </div>
    </div>
  );
}

function HeroPoint() {
  const myself = useMyProps("id", "hasHeroPoint");
  const dispatch = useServerDispatch();

  return (
    <div
      className="border-solid rounded-md w-10 h-10 flex justify-center items-center border-white opacity-80 m-2"
      style={{
        borderWidth: "5px",
        boxShadow: myself.hasHeroPoint ? "0 0 5px 1px #fff" : "",
        opacity: myself.hasHeroPoint ? "1" : "0.5",
      }}
      title={myself.hasHeroPoint ? "You Have a Hero Point!" : "No Hero Point"}
      onClick={() =>
        dispatch({
          actions: [
            playerUpdate({
              id: myself.id,
              changes: { hasHeroPoint: !myself.hasHeroPoint },
            }),
          ],
          optimisticKey: "hasHeroPoint",
          syncToServerThrottle: 0,
        })
      }
    >
      <FontAwesomeIcon
        icon={faDragon}
        fixedWidth
        style={{
          opacity: myself.hasHeroPoint ? 1 : 0.8,
          color: myself.hasHeroPoint ? "lightyellow" : "white",
        }}
      />
    </div>
  );
}

function AC({ character }: { character: RRCharacter }) {
  return (
    <div className="relative">
      <FontAwesomeIcon
        icon={faShieldAlt}
        className="text-white text-7xl opacity-50 right-2"
      />
      <p className="text-4xl font-bold w-full absolute top-3 text-white left-0 text-center">
        {character.AC}
      </p>
    </div>
  );
}

function CurrentCharacter({ character }: { character: RRCharacter | null }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const myself = useMyProps("color");
  return (
    <div>
      {settingsOpen && (
        <SettingsDialog onClose={() => setSettingsOpen(false)} />
      )}
      <div className="relative">
        {character ? (
          <CharacterPreview character={character} size={128} />
        ) : (
          <RRFontAwesomeIcon
            icon={faUserCircle}
            className="border-solid rounded-full border-4"
            style={{
              fontSize: "128px",
              backgroundColor: myself.color,
              borderColor: myself.color,
            }}
          />
        )}

        <div
          className="bg-gray-900 rounded-full absolute top-0 right-0 text-lg w-8 h-8 flex justify-center items-center"
          onClick={() => setSettingsOpen(true)}
        >
          <FontAwesomeIcon icon={faCog} />
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
