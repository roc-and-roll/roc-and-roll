import React from "react";
import { useCompendium } from "../compendium/Compendium";
import { useMyActiveCharacter } from "../../myself";
import { TextEntry } from "../quickReference/QuickReference";
import { CompendiumTextEntry } from "../compendium/types";

export function CombatCardHUD() {
  const character = useMyActiveCharacter("name");
  const { sources: compendiumSources } = useCompendium();

  const matchingMonsters = character
    ? compendiumSources.flatMap((source) =>
        source.data.monster?.filter(
          (monster) => monster.name === character.name
        )
      )
    : [];
  const monster = matchingMonsters[0];

  const showAction = (
    action: {
      name: string;
      entries: CompendiumTextEntry[];
    },
    key: React.Key
  ) => {
    return (
      <div key={key}>
        <p className="font-bold">{action.name}</p>
        {action.entries.map((entry, index) => {
          return (
            <TextEntry
              key={"textEntry" + index.toString()}
              entry={entry}
              rollName={`${monster!.name} ${action.name} `}
            />
          );
        })}
      </div>
    );
  };

  return monster ? (
    <div className="w-72 text-xs max-h-72 overflow-y-auto hud-panel p-2 rounded pointer-events-auto">
      {(monster.legendary?.length ?? 0) > 0 && (
        <>
          <h2 className="text-xl">Legendary Actions</h2>
          {monster.legendary?.map((action, index) => {
            return showAction(action, index);
          })}
        </>
      )}
      {(monster.action?.length ?? 0) > 0 && (
        <>
          {(monster.legendary?.length ?? 0) > 0 && (
            <h2 className="text-xl">Actions</h2>
          )}
          {monster.action?.map((action, index) => {
            return showAction(action, index);
          })}
        </>
      )}
    </div>
  ) : (
    <></>
  );
}
