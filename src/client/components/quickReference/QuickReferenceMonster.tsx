import React from "react";
import { assetImageAdd, characterTemplateAdd } from "../../../shared/actions";
import { randomColor } from "../../../shared/colors";
import { generateRandomToken, uploadRemoteFile } from "../../files";
import { useMyProps } from "../../myself";
import { useServerDispatch } from "../../state";
import {
  CompendiumMonster,
  CompendiumMonsterSkills,
} from "../compendium/types";
import { Button } from "../ui/Button";
import { TextEntry } from "./QuickReference";

export const Monster = React.memo(function Monster({
  monster,
}: {
  monster: CompendiumMonster;
}) {
  const myself = useMyProps("id");
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

    const templateAddAction = characterTemplateAdd({
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
      limitedUseSkills: [],
      attributes: {
        initiative: null,
        proficiency: null,
      },
      savingThrows: {
        STR: null,
        DEX: null,
        CON: null,
        INT: null,
        WIS: null,
        CHA: null,
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
    });

    dispatch([assetImageAddAction, templateAddAction]);
  }

  return (
    <>
      <div className="flex justify-between items-baseline">
        <p className="text-2xl mt-4">{monster.name}</p>
        <Button className="h-8" onClick={addTemplate}>
          Add To Templates
        </Button>
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

        <dt>Actions</dt>
        <dd>
          {monster.action?.map((action, index) => {
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
      </dl>
    </>
  );
});
