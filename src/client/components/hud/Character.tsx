import React, { useState } from "react";
import {
  conditionNames,
  conditionTooltip,
  RRCharacter,
  RRCharacterID,
  RRLimitedUseSkill,
  RRCharacterSpell,
  RRCharacterSpellID,
} from "../../../shared/state";
import { useMyActiveCharacter, useMyProps } from "../../myself";
import { useServerDispatch } from "../../state";
import { CharacterPreview } from "../characters/CharacterPreview";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBed,
  faClipboard,
  faCog,
  faDragon,
  faMagic,
  faMugHot,
  faPlus,
  faScroll,
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
import {
  characterUpdate,
  characterUpdateSpell,
  playerUpdate,
} from "../../../shared/actions";
import { CharacterEditor, conditionIcons } from "../characters/CharacterEditor";
import { Popover } from "../Popover";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../../shared/constants";
import { useDrag } from "react-dnd";
import clsx from "clsx";
import { Button } from "../ui/Button";
import { CombatCardHUD } from "./CombatCard";
import { TextareaInput } from "../ui/TextInput";

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
] as const;
export type RRCharacterProps = Pick<RRCharacter, typeof characterProps[number]>;

export function CharacterHUD() {
  const myself = useMyProps("mainCharacterId", "isGM");

  const character = useMyActiveCharacter();

  const healthWidth = 250;

  const [skillsVisible, setSkillsVisible] = useState(false);
  const [notesVisible, setNotesVisible] = useState(false);
  const [spellsVisible, setSpellsVisible] = useState(false);

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
            <div>
              <div className="flex justify-end">
                <div className="pointer-events-auto m-1 flex items-end flex-col">
                  <FontAwesomeIcon
                    title="Your skills"
                    icon={faScroll}
                    size="1x"
                    onClick={() => setSkillsVisible(!skillsVisible)}
                  />
                </div>
                <div className="pointer-events-auto m-1 flex items-end flex-col">
                  <FontAwesomeIcon
                    title="Notes"
                    icon={faClipboard}
                    size="1x"
                    onClick={() => setNotesVisible(!notesVisible)}
                  />
                </div>
                <div className="pointer-events-auto m-1 flex items-end flex-col">
                  <FontAwesomeIcon
                    title="Spells"
                    icon={faMagic}
                    size="1x"
                    onClick={() => setSpellsVisible(!spellsVisible)}
                  />
                </div>
              </div>
              {notesVisible && <Notes character={character} />}
              {skillsVisible && <LimitedUse character={character} />}
              {spellsVisible && <Spells character={character} />}
            </div>
            <CombatCardHUD />
          </div>
        )}
        <div className="flex flex-col items-center pointer-events-none min-h-min">
          <CurrentCharacter character={character} />
          {character && <AC character={character} />}
          {character && <SpellSave character={character} />}
          {<HeroPoint />}
        </div>
      </div>
    </div>
  );
}

function Spells({ character }: { character: RRCharacterProps }) {
  const dispatch = useServerDispatch();
  const togglePrepareSpell = (prepared: boolean, spellId: RRCharacterSpellID) =>
    dispatch({
      actions: [
        characterUpdateSpell({
          id: character.id,
          spell: { id: spellId, changes: { prepared } },
        }),
      ],
      optimisticKey: `spells/${character.id}/${spellId}`,
      syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
    });
  return (
    <div className="min-w-full mt-2 bg-black/25 p-1 rounded pointer-events-auto select-none">
      {character.spells.length < 1 && (
        <em>No spells yet. Add some from the Quick Reference.</em>
      )}
      {buildSpells({ character, prepared: true, togglePrepareSpell })}
      {character.spells.some((spell) => spell.prepared) &&
        character.spells.some((spell) => !spell.prepared) && (
          <div className="border-t-2"></div>
        )}
      {buildSpells({ character, prepared: false, togglePrepareSpell })}
    </div>
  );
}

function buildSpells({
  character,
  prepared,
  togglePrepareSpell,
}: {
  character: RRCharacterProps;
  prepared: boolean;
  togglePrepareSpell: (prepared: boolean, spellId: RRCharacterSpellID) => void;
}) {
  return (
    <div>
      {[...Array(10)].map((_x, level) =>
        character.spells.some(
          (spell) => spell.level === level && spell.prepared === prepared
        ) ? (
          <div key={level} className={clsx(prepared ? "" : "opacity-50")}>
            <div className="flex flex-row">
              <em>{level === 0 ? "Cantrips" : `Level ${level}`}</em>
              <em className="flex-grow text-right">Prepared</em>
            </div>
            {character.spells
              .filter(
                (spell: RRCharacterSpell) =>
                  spell.level === level && spell.prepared === prepared
              )
              .map((spell: RRCharacterSpell) => {
                return (
                  <div key={spell.id} className="flex flex-row justify-between">
                    {spell.name}
                    <input
                      type="checkbox"
                      checked={spell.prepared}
                      onChange={(event) =>
                        togglePrepareSpell(event.target.checked, spell.id)
                      }
                    />
                  </div>
                );
              })}
            <div className="border-t w-full" />
          </div>
        ) : (
          <div key={level} />
        )
      )}
    </div>
  );
}

function Notes({ character }: { character: RRCharacterProps }) {
  const dispatch = useServerDispatch();

  return (
    <div className="min-w-full mt-2 bg-black/25 p-1 rounded pointer-events-auto">
      <TextareaInput
        placeholder="Character Notes"
        value={character.notes}
        onChange={(notes) =>
          dispatch({
            actions: [
              characterUpdate({ id: character.id, changes: { notes } }),
            ],
            optimisticKey: "notes",
            syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
          })
        }
      />
    </div>
  );
}

function LimitedUse({ character }: { character: RRCharacterProps }) {
  const dispatch = useServerDispatch();
  const setLimitedUseSkills = (
    updater: React.SetStateAction<RRCharacter["limitedUseSkills"]>
  ) =>
    dispatch((state) => {
      const oldSkills =
        state.characters.entities[character.id]?.limitedUseSkills;

      if (oldSkills === undefined) return [];

      const newSkills =
        typeof updater === "function" ? updater(oldSkills) : updater;

      return {
        actions: [
          characterUpdate({
            id: character.id,
            changes: { limitedUseSkills: newSkills },
          }),
        ],
        optimisticKey: "limitedUseSkills",
        syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
      };
    });

  function doSkill(index: number, skill: RRLimitedUseSkill) {
    setLimitedUseSkills([
      ...character.limitedUseSkills.slice(0, index),
      { ...skill, currentUseCount: skill.currentUseCount + 1 },
      ...character.limitedUseSkills.slice(index + 1),
    ]);
  }

  function takeRest(isLongRest: boolean) {
    setLimitedUseSkills((skills) =>
      skills.map((skill) => {
        let currentUseCount = skill.currentUseCount;
        if (skill.restoresAt === "shortRest") currentUseCount = 0;
        else if (isLongRest) currentUseCount = 0;
        return { ...skill, currentUseCount };
      })
    );
  }

  return (
    <div className="min-w-full select-none mt-2 bg-black/25 p-1 rounded pointer-events-auto">
      <div className="flex justify-end">
        <Button onClick={() => takeRest(true)}>
          <FontAwesomeIcon fixedWidth icon={faBed} />
        </Button>
        <Button onClick={() => takeRest(false)}>
          <FontAwesomeIcon fixedWidth icon={faMugHot} />
        </Button>
      </div>
      {character.limitedUseSkills.map((skill, index) => {
        const skillUsed = skill.currentUseCount >= skill.maxUseCount;
        return (
          <div
            key={index}
            className={clsx(
              "flex items-center",
              skillUsed ? "line-through opacity-50" : "cursor-pointer"
            )}
            onClick={() => {
              if (skillUsed) return;
              doSkill(index, skill);
            }}
          >
            {skill.name}
            <div className="text-right flex-grow">
              {skill.currentUseCount} / {skill.maxUseCount}
            </div>
            <FontAwesomeIcon
              className="ml-2"
              fixedWidth
              icon={skill.restoresAt === "longRest" ? faBed : faMugHot}
            />
          </div>
        );
      })}
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
            title={conditionTooltip(condition)}
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
                    title={conditionTooltip(condition)}
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

function CurrentCharacter({ character }: { character: RRCharacter | null }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const myself = useMyProps("color");

  return (
    <div className="pointer-events-auto">
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
      className="token-preview"
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
