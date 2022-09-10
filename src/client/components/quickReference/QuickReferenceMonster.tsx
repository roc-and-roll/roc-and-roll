import React from "react";
import { assetImageAdd, characterAdd } from "../../../shared/actions";
import { randomColor } from "../../../shared/colors";
import { generateRandomToken, uploadRemoteFile } from "../../files";
import { useMyProps } from "../../myself";
import { useServerDispatch } from "../../state";
import {
  CompendiumMonster,
  CompendiumMonsterSkills,
} from "../../../shared/compendium-types/monster";
import { Button } from "../ui/Button";
import { TextEntry, TextEntryString } from "./QuickReference";
import { CompendiumTextEntry } from "../../../shared/compendium-types/text-entry";
import { useCompendium } from "../compendium/Compendium";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSkull } from "@fortawesome/free-solid-svg-icons";

export function getMonsterSpeedAsString(monster: CompendiumMonster) {
  if (!monster.speed) return "";
  return Object.entries(monster.speed)
    .map(([speedType, value]) => {
      return typeof value === "number"
        ? value.toString() + "ft " + speedType
        : typeof value === "boolean"
        ? "can hover" // it's the only boolean that exists
        : value.number.toString() +
          " ft " +
          speedType +
          " if " +
          value.condition.slice(1, -1);
    })
    .join(", ");
}

export function useLairActions(monster: CompendiumMonster | undefined) {
  const { sources: compendiumSources } = useCompendium();

  if (!monster) return null;
  const legendaryGroups = monster.legendaryGroup
    ? compendiumSources.flatMap((source) => {
        return source.data.legendaryGroups
          ? source.data.legendaryGroups.filter(
              (group) => group.name === monster.legendaryGroup!.name
            )
          : [];
      })
    : [];
  const legendaryGroup = legendaryGroups[0];
  return legendaryGroup?.lairActions ?? null;
}

export const Monster = React.memo(function Monster({
  monster,
}: {
  monster: CompendiumMonster;
}) {
  const myself = useMyProps("id", "isGM");
  const dispatch = useServerDispatch();
  const lairActions = useLairActions(monster);

  function parseAC(): number | null {
    if (monster.ac === undefined) return null;
    return typeof monster.ac[0] === "number"
      ? monster.ac[0]
      : monster.ac[0]?.ac ?? null;
  }

  function getSkill(skillName: keyof CompendiumMonsterSkills) {
    const key = monster.skill?.[skillName];
    return key === undefined ? null : parseInt(key);
  }
  function getSavingThrow(save: "str" | "dex" | "con" | "int" | "wis" | "cha") {
    const key = monster.save?.[save];
    return key === undefined ? null : parseInt(key);
  }

  function getTokenSize() {
    // TODO: Why can some monsters have multiple sizes?
    const size = monster.size?.[0];

    return size === undefined || size === "M"
      ? 1
      : size === "T"
      ? 0.5
      : size === "S"
      ? 0.7
      : size === "L"
      ? 2
      : size === "H"
      ? 3
      : 4;
  }

  async function addTemplate() {
    const image = monster.imageUrl
      ? await uploadRemoteFile(monster.imageUrl, "image")
      : await generateRandomToken();

    const assetImageAddAction = assetImageAdd({
      name: image.originalFilename,
      description: null,
      tags: [],
      extra: {},

      location: {
        type: "local",
        filename: image.filename,
        originalFilename: image.originalFilename,
        mimeType: image.mimeType,
      },

      type: "image",
      originalFunction: "token",
      blurHash: image.blurHash,
      width: image.width,
      height: image.height,

      playerId: myself.id,
    });

    const templateAddAction = characterAdd({
      name: monster.name,
      hp: monster.hp?.average ?? 0,
      maxHP: monster.hp?.average ?? 0,
      ac: parseAC(),

      auras: [],
      conditions: [],
      temporaryHP: 0,
      maxHPAdjustment: 0,

      stats: {
        STR: monster.str ?? null,
        DEX: monster.dex ?? null,
        CON: monster.con ?? null,
        INT: monster.int ?? null,
        WIS: monster.wis ?? null,
        CHA: monster.cha ?? null,
      },

      spellSaveDC: null,
      scale: getTokenSize(),
      visibility: "everyone",
      // FIXME if there are multiple spellcasting entries this will be tricky
      limitedUseSkills: monster.spellcasting?.[0]?.spells
        ? Object.entries(monster.spellcasting[0].spells)
            .map(([level, s]) =>
              "slots" in s
                ? {
                    name: `Spell Slots Lvl ${level}`,
                    maxUseCount: s.slots ? s.slots : 0,
                    currentUseCount: 0,
                    restoresAt: "longRest" as const,
                  }
                : null
            )
            .flatMap((x) => (x ? [x] : []))
        : [],
      attributes: {
        initiative: null,
        proficiency: null,
        level: null,
      },
      savingThrows: {
        STR: getSavingThrow("str"),
        DEX: getSavingThrow("dex"),
        CON: getSavingThrow("con"),
        INT: getSavingThrow("int"),
        WIS: getSavingThrow("wis"),
        CHA: getSavingThrow("cha"),
      },
      skills: {
        Athletics: getSkill("athletics"),
        Acrobatics: getSkill("acrobatics"),
        "Sleight of Hand": getSkill("sleight of hand"),
        Stealth: getSkill("stealth"),
        Arcana: getSkill("arcana"),
        History: getSkill("history"),
        Investigation: getSkill("investigation"),
        Nature: getSkill("nature"),
        Religion: getSkill("religion"),
        "Animal Handling": getSkill("animal handling"),
        Insight: getSkill("insight"),
        Medicine: getSkill("medicine"),
        Perception: getSkill("perception"),
        Survival: getSkill("survival"),
        Deception: getSkill("deception"),
        Intimidation: getSkill("intimidation"),
        Performance: getSkill("performance"),
        Persuasion: getSkill("persuasion"),
      },
      tokenImageAssetId: assetImageAddAction.payload.id,
      tokenBorderColor: randomColor(),
      localToMap: null,
      isTemplate: true,
      diceTemplateCategories: [],
      dice: [],
      notes: "",
      spells: [], // TODO add spells potentially
      currentlyConcentratingOn: null,
    });

    dispatch([assetImageAddAction, templateAddAction]);
  }

  function renderTextEntries(
    title: string,
    entries: { name: string; entries: CompendiumTextEntry[] }[]
  ) {
    return (
      <>
        <dt>{title}</dt>
        <dd>
          {entries.map((action, index) => {
            return (
              <div key={index}>
                <p className="font-bold">{action.name}</p>
                {action.entries.map((entry, index) => {
                  return (
                    <TextEntry
                      key={"textEntry" + index.toString()}
                      entry={entry}
                      rollName={`${monster.name} ${action.name} `}
                    />
                  );
                })}
              </div>
            );
          })}
        </dd>
      </>
    );
  }

  const renderLairAction = (
    action: {
      name?: string;
      entries: CompendiumTextEntry[];
    },
    key: React.Key
  ) => {
    return (
      <div key={key}>
        {action.name && <p className="font-bold">{action.name}</p>}
        {action.entries.map((entry, index) => {
          return (
            <div className="flex" key={index}>
              {!action.name && <p className="pr-1">•</p>}
              <TextEntry
                key={"textEntry" + index.toString()}
                entry={entry}
                rollName={`${monster.name} ${action.name ?? ""} `}
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div className="flex justify-between items-baseline">
        <FontAwesomeIcon icon={faSkull} className="mr-2" />
        <p className="text-2xl flex-1">{monster.name}</p>
        {myself.isGM && (
          <Button className="h-8" onClick={addTemplate}>
            Add To Templates
          </Button>
        )}
      </div>
      <dl>
        <dt>Stat Block</dt>
        <dd>
          <div className="flex">
            {Object.entries({
              STR: monster.str,
              DEX: monster.dex,
              CON: monster.con,
              INT: monster.int,
              WIS: monster.wis,
              CHA: monster.cha,
            }).map(([key, value]) => {
              return (
                <div
                  className="border m-1 p-1 text-center flex-1 max-w-24"
                  key={key}
                >
                  <p>{value ?? null}</p>
                  <p className="font-bold">{key}</p>
                </div>
              );
            })}
          </div>
        </dd>

        <dt>Armor Class</dt>
        <dd>{parseAC()}</dd>
        <dt>Hit Points</dt>
        <dd>
          {monster.hp !== undefined && (
            <p>
              {monster.hp.average} ({monster.hp.formula})
            </p>
          )}
        </dd>
        {monster.speed && (
          <>
            <dt>Speed</dt>
            <dd>{getMonsterSpeedAsString(monster)}</dd>
          </>
        )}
        {monster.immune && monster.immune.length > 0 && (
          <>
            <dt>
              Damage
              <br />
              Immunities
            </dt>
            <dd className="my-auto mx-0">
              {monster.immune.map(
                (immunity, index) =>
                  typeof immunity === "string"
                    ? immunity +
                      (index >= monster.immune!.length - 1 ? "" : ", ")
                    : "" //Todo handle conditional immunities
              )}
            </dd>
          </>
        )}
        {monster.conditionImmune && monster.conditionImmune.length > 0 && (
          <>
            <dt>
              Condition
              <br />
              Immunities
            </dt>
            <dd className="my-auto mx-0">
              {monster.conditionImmune.map(
                (immunity, index) =>
                  immunity +
                  (index >= monster.conditionImmune!.length - 1 ? "" : ", ")
              )}
            </dd>
          </>
        )}
        {monster.trait && renderTextEntries("Traits", monster.trait)}
        {monster.legendary &&
          renderTextEntries("Legendary Actions", monster.legendary)}
        {monster.action && renderTextEntries("Actions", monster.action)}
        {lairActions && (
          <>
            <dt>Lair Actions</dt>
            <dd>
              {lairActions.map((action, index) =>
                typeof action === "string" ? (
                  <p key={index}>{action}</p>
                ) : action.type === "entries" ? (
                  renderLairAction(action, index)
                ) : (
                  renderLairAction({ entries: action.items }, index)
                )
              )}
            </dd>
          </>
        )}
        {monster.spellcasting && (
          <>
            <dt>Spell Casting</dt>
            <MonsterSpellcasting monster={monster} />
          </>
        )}
      </dl>
    </>
  );
});

export function MonsterSpellcasting({
  monster,
  short,
}: {
  monster: CompendiumMonster;
  short?: boolean;
}) {
  if (!monster.spellcasting) return null;

  const showLevel = (level: string, slots: number) =>
    short ? (
      <>
        {
          ["I", "II", "III", "IV", "V", "VI", "VI", "VII", "VIII", "IX", "X"][
            parseInt(level) - 1
          ]!
        }{" "}
        <span title="Spell slots">({slots})</span>
      </>
    ) : (
      `Level ${level} ${
        slots > 0 ? ` (${slots} slot${slots === 1 ? "" : "s"})` : ""
      }`
    );

  return (
    <div>
      {monster.spellcasting.map((spellType) => (
        <div key={spellType.name}>
          {spellType.headerEntries.map((entry, index) => (
            <TextEntry
              key={index}
              entry={entry}
              rollName={monster.name}
            ></TextEntry>
          ))}
          {spellType.daily &&
            Object.entries(spellType.daily).map(([key, value]) => (
              <div key={key}>
                <dt>{key.substring(0, 1)} / per day</dt>
                <dd>
                  {value.map((entry, index) => {
                    entry =
                      typeof entry !== "string" && "hidden" in entry
                        ? entry.entry
                        : entry;
                    return (
                      <TextEntry
                        key={`daily${index}`}
                        entry={entry}
                        rollName="monster.name"
                      ></TextEntry>
                    );
                  })}
                </dd>
              </div>
            ))}
          {spellType.spells &&
            Object.entries(spellType.spells).map(([level, value]) => (
              <div key={level}>
                <strong>
                  {level === "0"
                    ? "Cantrips"
                    : showLevel(
                        level,
                        "slots" in value ? (value.slots ? value.slots : 0) : 0
                      )}
                  :{" "}
                </strong>
                {value.spells.map((x, index) => (
                  <div key={index}>
                    <TextEntryString
                      key={index}
                      text={x}
                      rollName={monster.name}
                    />
                    {index < value.spells.length - 1 && ", "}
                  </div>
                ))}
              </div>
            ))}
          {spellType.will && <dt>At Will</dt>}
          {spellType.will?.map((entry, index) => {
            entry =
              typeof entry !== "string" && "hidden" in entry
                ? entry.entry
                : entry;
            return (
              <TextEntry
                key={index}
                entry={entry}
                rollName={monster.name}
              ></TextEntry>
            );
          })}
          {spellType.footerEntries?.map((entry, index) => (
            <TextEntry
              key={index}
              entry={entry}
              rollName={monster.name}
            ></TextEntry>
          ))}
        </div>
      ))}
    </div>
  );
}
