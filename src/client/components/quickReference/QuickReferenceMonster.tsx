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

export const Monster = React.memo(function Monster({
  monster,
}: {
  monster: CompendiumMonster;
}) {
  const myself = useMyProps("id", "isGM");
  const dispatch = useServerDispatch();

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
    return monster.size === undefined ||
      monster.size === "T" || //technically these would be a quarter of a square only
      monster.size === "S" ||
      monster.size === "M"
      ? 1
      : monster.size === "L"
      ? 2
      : monster.size === "H"
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
                    maxUseCount: s.slots,
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

  return (
    <>
      <div className="flex justify-between items-baseline">
        <p className="text-2xl mt-4">{monster.name}</p>
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
                <div className="border m-1 p-1 text-center w-24" key={key}>
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
            <dt>Damage Immunities</dt>
            <dd>
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
            <dt>Condition Immunities</dt>
            <dd>
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
    <>
      <dd>
        {monster.spellcasting.map((spellType) => (
          <>
            {spellType.headerEntries.map((entry, index) => (
              <TextEntry
                key={index}
                entry={entry}
                rollName={monster.name}
              ></TextEntry>
            ))}
            {spellType.daily &&
              Object.entries(spellType.daily).map(([key, value]) => (
                <>
                  <dt>{key.substring(0, 1)} / per day</dt>
                  <dd>
                    {value.map((x, index) => (
                      <TextEntry
                        key={`daily${index}`}
                        entry={x}
                        rollName="monster.name"
                      ></TextEntry>
                    ))}
                  </dd>
                </>
              ))}
            {spellType.spells &&
              Object.entries(spellType.spells).map(([level, value]) => (
                <div key={level}>
                  <strong>
                    {level === "0"
                      ? "Cantrips"
                      : showLevel(level, "slots" in value ? value.slots : 0)}
                    :{" "}
                  </strong>
                  {value.spells.map((x, index) => (
                    <>
                      <TextEntryString
                        key={index}
                        text={x}
                        rollName={monster.name}
                      />
                      {index < value.spells.length - 1 && ", "}
                    </>
                  ))}
                </div>
              ))}
            {spellType.will && <dt>At Will</dt>}
            {spellType.will?.map((entry, index) => (
              <TextEntry
                key={index}
                entry={entry}
                rollName={monster.name}
              ></TextEntry>
            ))}
            {spellType.footerEntries?.map((entry, index) => (
              <TextEntry
                key={index}
                entry={entry}
                rollName={monster.name}
              ></TextEntry>
            ))}
          </>
        ))}
      </dd>
    </>
  );
}
