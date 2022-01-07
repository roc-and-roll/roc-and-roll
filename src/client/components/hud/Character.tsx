import React, { useState } from "react";
import {
  conditionNames,
  RRCharacter,
  RRCharacterID,
} from "../../../shared/state";
import { useMyProps, useMySelectedCharacters } from "../../myself";
import { useServerDispatch, useServerState } from "../../state";
import { CharacterPreview } from "../characters/CharacterPreview";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCog,
  faDragon,
  faMagic,
  faPlus,
  faShieldAlt,
  faUserCircle,
} from "@fortawesome/free-solid-svg-icons";
import { SettingsDialog } from "./Toolbar";
import { HPInlineEdit } from "../map/HPInlineEdit";
import {
  useSmartChangeHP,
  useHealthBarMeasurements,
} from "../../../client/util";
import { RRFontAwesomeIcon } from "../RRFontAwesomeIcon";
import { characterUpdate, playerUpdate } from "../../../shared/actions";
import { conditionIcons } from "../characters/CharacterEditor";
import { Popover } from "../Popover";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../../shared/constants";
import { useDrag } from "react-dnd";

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
] as const;
export type RRCharacterProps = Pick<RRCharacter, typeof characterProps[number]>;

export function CharacterHUD() {
  const myself = useMyProps("mainCharacterId", "isGM");

  const selectedCharacters = useMySelectedCharacters(...characterProps);
  const mainCharacter = useServerState((state) =>
    myself.mainCharacterId
      ? state.characters.entities[myself.mainCharacterId] ?? null
      : null
  );

  const healthWidth = 250;
  const character =
    selectedCharacters.length === 1 ? selectedCharacters[0]! : mainCharacter;

  return (
    <div className="absolute top-0 right-0 pointer-events-none">
      <div className="flex m-2">
        {character && (
          <div style={{ width: healthWidth }} className="m-4 flex flex-col">
            <HealthBar
              character={character}
              isGM={myself.isGM}
              width={healthWidth}
            />
            <ConditionsBar character={character} />
          </div>
        )}
        <div className="flex flex-col justify-center items-center pointer-events-auto">
          <CurrentCharacter character={character} />
          {character && <AC character={character} />}
          {character && <SpellSave character={character} />}
          {<HeroPoint />}
        </div>
      </div>
    </div>
  );
}

function ConditionsBar({ character }: { character: RRCharacterProps }) {
  const [conditionChooserOpen, setConditionChooserOpen] = useState(false);
  const dispatch = useServerDispatch();

  const setConditions = (
    updater: React.SetStateAction<RRCharacter["conditions"]>
  ) =>
    dispatch((state) => {
      const oldConditions = state.characters.entities[character.id]?.conditions;

      if (oldConditions === undefined) {
        return [];
      }

      const newConditions =
        typeof updater === "function" ? updater(oldConditions) : updater;

      return {
        actions: [
          characterUpdate({
            id: character.id,
            changes: { conditions: newConditions },
          }),
        ],
        optimisticKey: "conditions",
        syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
      };
    });

  return (
    <div className="flex flex-wrap flex-row-reverse pointer-events-auto">
      {character.conditions.map((condition) => {
        const icon = conditionIcons[condition];
        return (
          <div
            key={condition}
            title={condition}
            className="h-8 w-8 m-1 my-2 cursor-pointer"
            onClick={() => {
              setConditions((c) => c.filter((c) => c !== condition));
            }}
          >
            {typeof icon === "string" ? (
              <img src={icon}></img>
            ) : (
              <FontAwesomeIcon
                icon={icon}
                color="black"
                size={"2x"}
                style={{
                  stroke: "white",
                  strokeWidth: 18,
                }}
              />
            )}
          </div>
        );
      })}
      <Popover
        content={
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="flex flex-wrap"
          >
            {conditionNames
              .filter((c) => !character.conditions.includes(c))
              .map((condition) => {
                const icon = conditionIcons[condition];
                return (
                  <div
                    key={condition}
                    title={condition}
                    className="h-14 w-11 m-1 my-2"
                    onClick={() => {
                      setConditions((c) => [...c, condition]);
                      setConditionChooserOpen(false);
                    }}
                  >
                    {typeof icon === "string" ? (
                      <img src={icon}></img>
                    ) : (
                      <FontAwesomeIcon
                        icon={icon}
                        color="black"
                        size={"2x"}
                        style={{
                          stroke: "white",
                          strokeWidth: 18,
                        }}
                      />
                    )}
                    <p className="text-xs truncate text-center">{condition}</p>
                  </div>
                );
              })}
          </div>
        }
        visible={conditionChooserOpen}
        onClickOutside={() => setConditionChooserOpen(false)}
        interactive
        placement="bottom"
      >
        <div
          title="Add Condition"
          className="h-8 w-8 m-1 my-2 flex items-center justify-center rounded-full bg-rr-500 cursor-pointer"
          onClick={() => setConditionChooserOpen((b) => !b)}
        >
          <FontAwesomeIcon icon={faPlus} color="black" size={"1x"} />
        </div>
      </Popover>
    </div>
  );
}

function HeroPoint() {
  const myself = useMyProps("id", "hasHeroPoint");
  const dispatch = useServerDispatch();

  return (
    <div
      className="border-solid rounded-md w-10 h-10 flex justify-center items-center border-white opacity-80 m-2 cursor-pointer"
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
    <div className="relative">
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
    <div className="relative">
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

function CurrentCharacter({
  character,
}: {
  character: RRCharacterProps | null;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const myself = useMyProps("color");
  return (
    <div>
      {settingsOpen && (
        <SettingsDialog onClose={() => setSettingsOpen(false)} />
      )}
      <div className="relative">
        {character ? (
          <DraggableCharacterPreview character={character} />
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

function DraggableCharacterPreview({
  character,
}: {
  character: RRCharacterProps;
}) {
  const [, dragRef] = useDrag<{ id: RRCharacterID }, void, null>(
    () => ({
      type: "token",
      item: { id: character.id },
    }),
    [character.id]
  );

  return (
    <div ref={dragRef} className="token-preview">
      <CharacterPreview
        character={character}
        size={128}
        shouldDisplayShadow={false}
      />
    </div>
  );
}

function HealthBar({
  character,
  isGM,
  width,
}: {
  character: RRCharacterProps;
  isGM: boolean;
  width: number;
}) {
  const setHP = useSmartChangeHP(isGM);
  const {
    temporaryHPBarWidth,
    hpBarWidth,
    hpColor,
    temporaryHPColor,
    totalMaxHP,
  } = useHealthBarMeasurements(character, width);

  return (
    <div
      className="flex h-8 rounded-md overflow-hidden bg-white relative pointer-events-auto"
      style={{ width }}
    >
      {character.maxHP > 0 && (
        <>
          <div
            className="h-full absolute left-0 top-0"
            style={{
              width: hpBarWidth,
              height: "100%",
              backgroundColor: hpColor,
            }}
          />
          {character.temporaryHP > 0 && temporaryHPBarWidth > 0 && (
            <div
              className="h-full absolute top-0"
              style={{
                width: temporaryHPBarWidth,
                left: hpBarWidth,
                backgroundColor: temporaryHPColor,
              }}
            ></div>
          )}
        </>
      )}
      <div className="absolute h-full flex items-center justify-end left-4 right-4 select-none text-black rough-text text-2xl font-bold">
        <HPInlineEdit
          className="inline-block w-12 h-6 flex-1 mr-1 px-2 text-2xl"
          hp={character.hp + character.temporaryHP}
          setHP={(total) => setHP(character.id, total)}
        />{" "}
        / {totalMaxHP}
      </div>
    </div>
  );
}
