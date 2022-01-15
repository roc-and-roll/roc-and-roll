import React from "react";
import { assetImageAdd, characterTemplateAdd } from "../../../shared/actions";
import { randomColor } from "../../../shared/colors";
import { generateRandomToken } from "../../files";
import { useMyProps } from "../../myself";
import { useServerDispatch } from "../../state";
import { CompendiumMonster } from "../compendium/types";
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

  async function addTemplate() {
    const image = await generateRandomToken();
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
      scale: 1,
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
        Athletics: null,
        Acrobatics: null,
        "Sleight of Hand": null,
        Stealth: null,
        Arcana: null,
        History: null,
        Investigation: null,
        Nature: null,
        Religion: null,
        "Animal Handling": null,
        Insight: null,
        Medicine: null,
        Perception: null,
        Survival: null,
        Deception: null,
        Intimidation: null,
        Performance: null,
        Persuasion: null,
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

        <dt>Actions</dt>
        <dd>
          {monster.action?.map((action, index) => {
            return (
              <div key={index}>
                <p className="font-bold">{action.name}</p>
                {action.entries.map((entry, index) => {
                  return (
                    <TextEntry
                      key={index}
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
