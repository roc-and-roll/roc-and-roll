import React, { useState } from "react";
import { RRCharacter, RRCharacterID } from "../../../../shared/state";
import { useMyActiveCharacters, useMyProps } from "../../../myself";
import { useServerDispatch } from "../../../state";
import {
  CharacterPreview,
  CharacterStack,
} from "../../characters/CharacterPreview";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCog,
  faDragon,
  faMagic,
  faShieldAlt,
  faUserCircle,
} from "@fortawesome/free-solid-svg-icons";
import { SettingsDialog } from "../Toolbar";
import { RRFontAwesomeIcon } from "../../RRFontAwesomeIcon";
import {
  characterUpdateHPRelatively,
  playerUpdate,
} from "../../../../shared/actions";
import { CharacterEditor } from "../../characters/CharacterEditor";
import { Popover } from "../../Popover";
import { useDrag } from "react-dnd";
import { SmartTextInput } from "../../ui/TextInput";
import { ConditionsBar } from "./Conditions";
import { HealthBar } from "./HealthBar";
import { Button } from "../../ui/Button";
import { CharacterPopUps } from "./PopUps";

const characterProps = [
  "id",
  "name",
  "hp",
  "maxHP",
  "temporaryHP",
  "maxHPAdjustment",
  "conditions",
  "ac",
  "tokenImageAssetId",
  "tokenBorderColor",
  "spellSaveDC",
  "limitedUseSkills",
  "notes",
  "spells",
  "currentlyConcentratingOn",
] as const;
export type RRCharacterProps = Pick<
  RRCharacter,
  (typeof characterProps)[number]
>;

export function CharacterHUD() {
  const myself = useMyProps("mainCharacterId", "isGM");

  const characters = useMyActiveCharacters();

  const healthWidth = 250;

  return (
    <div className="absolute top-0 right-0 pointer-events-none">
      <div className="flex m-2 items-start">
        {characters.length === 1 &&
          (() => {
            const character = characters[0]!;

            return (
              <div
                style={{ width: healthWidth }}
                className="mr-4 flex flex-col"
              >
                <HealthBar
                  character={character}
                  isGM={myself.isGM}
                  width={healthWidth}
                />
                <ConditionsBar character={character} />
                <CharacterPopUps character={character} />
              </div>
            );
          })()}
        {characters.length > 1 && (
          <RelativeHealthEditor characters={characters} />
        )}
        <div className="flex flex-col items-center pointer-events-none min-h-min">
          <CurrentCharacters characters={characters} />
          {characters.length === 1 && <AC character={characters[0]!} />}
          {characters.length === 1 && <SpellSave character={characters[0]!} />}
          {<HeroPoint />}
        </div>
      </div>
    </div>
  );
}

function RelativeHealthEditor({
  characters,
}: {
  characters: RRCharacterProps[];
}) {
  const dispatch = useServerDispatch();
  const [relativeHP, setRelativeHP] = useState("");

  function changeHP(factor: number) {
    setRelativeHP("");
    const newValue = parseInt(relativeHP) || 0;
    dispatch(
      characters.map((character) =>
        characterUpdateHPRelatively({
          id: character.id,
          relativeHP: newValue * factor,
        })
      )
    );
  }

  return (
    <div className="select-auto pointer-events-auto mr-2">
      <SmartTextInput
        className="mb-1 border rounded-md px-2 py-1 border-black"
        value={relativeHP}
        onChange={setRelativeHP}
      />
      <div className="flex">
        <Button
          className="flex-grow bg-red-700 mr-1"
          onClick={() => changeHP(-1)}
        >
          damage
        </Button>
        <Button className="flex-grow bg-green-700" onClick={() => changeHP(1)}>
          heal
        </Button>
      </div>
    </div>
  );
}

function HeroPoint() {
  const myself = useMyProps("id", "hasHeroPoint");
  const dispatch = useServerDispatch();

  return (
    <div
      className="border-solid rounded-md w-10 h-10 flex justify-center items-center border-white opacity-80 m-2 cursor-pointer pointer-events-auto"
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

function AC({ character }: { character: RRCharacterProps }) {
  return (
    <div className="relative pointer-events-auto">
      <FontAwesomeIcon
        icon={faShieldAlt}
        fixedWidth
        className="text-white text-7xl opacity-50 right-2 m-1"
      />
      <p className="text-4xl font-bold w-full absolute top-4 text-white left-0 text-center select-none">
        {character.ac ?? "?"}
      </p>
    </div>
  );
}

function SpellSave({ character }: { character: RRCharacterProps }) {
  return (
    <div className="relative pointer-events-auto">
      <FontAwesomeIcon
        icon={faMagic}
        fixedWidth
        className="text-white text-6xl opacity-50 right-2 m-1 "
      />
      <p className="text-4xl font-bold w-full absolute top-4 text-white left-0 text-center select-none">
        {character.spellSaveDC ?? "?"}
      </p>
    </div>
  );
}

function CurrentCharacters({ characters }: { characters: RRCharacter[] }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const myself = useMyProps("color");

  return (
    <div className="pointer-events-auto">
      {settingsOpen && (
        <SettingsDialog onClose={() => setSettingsOpen(false)} />
      )}
      <div className="relative">
        {characters.length === 1 ? (
          <DraggableCharacterPreview character={characters[0]!} />
        ) : characters.length > 0 ? (
          <CharacterStack characters={characters} size={128} />
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

function DraggableCharacterPreview({ character }: { character: RRCharacter }) {
  const [, dragRef] = useDrag<{ id: RRCharacterID }, void, null>(
    () => ({
      type: "token",
      item: { id: character.id },
    }),
    [character.id]
  );
  const [editorVisible, setEditorVisible] = useState(false);

  return (
    <div
      ref={dragRef}
      className="token-preview m-0"
      onClick={() => setEditorVisible(true)}
    >
      <Popover
        content={
          <div onMouseDown={(e) => e.stopPropagation()}>
            <CharacterEditor
              character={character}
              wasJustCreated={false}
              onNameFirstEdited={() => {}}
              onClose={() => setEditorVisible(false)}
            />
          </div>
        }
        visible={editorVisible}
        onClickOutside={() => setEditorVisible(false)}
        interactive
        placement="right"
      >
        <CharacterPreview
          character={character}
          size={128}
          shouldDisplayShadow={false}
        />
      </Popover>
    </div>
  );
}
