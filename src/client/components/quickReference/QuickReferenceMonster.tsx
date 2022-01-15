import React from "react";
import { CompendiumMonster } from "../compendium/types";
import { TextEntry } from "./QuickReference";

export const Monster = React.memo(function Monster({
  monster,
}: {
  monster: CompendiumMonster;
}) {
  return (
    <>
      <p className="text-2xl mt-4">{monster.name}</p>
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
        <dd>
          {monster.ac !== undefined &&
            (typeof monster.ac[0] === "number"
              ? monster.ac[0]
              : monster.ac[0]?.ac)}
        </dd>
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
