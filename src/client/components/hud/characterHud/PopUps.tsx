import {
  faScroll,
  faClipboard,
  faMagic,
  faSkull,
  IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import React, { useState } from "react";
import { characterUpdate } from "../../../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../../../shared/constants";
import { RRCharacter } from "../../../../shared/state";
import { useServerDispatch } from "../../../state";
import { useCompendium } from "../../compendium/Compendium";
import { TextareaInput } from "../../ui/TextInput";
import { RRCharacterProps } from "./Character";
import { CombatCardHUD } from "./CombatCard";
import { LimitedUse } from "./LimitedUseSkills";
import { Spells } from "./Spells";

export function CharacterPopUps({ character }: { character: RRCharacter }) {
  const popUps = ["skills", "notes", "spells", "combatCard", "none"] as const;
  const [popUpVisible, setPopUpVisible] =
    useState<(typeof popUps)[number]>("none");
  function togglePopUpVisible(popUp: (typeof popUps)[number]) {
    setPopUpVisible((prev) => (prev === popUp ? "none" : popUp));
  }
  const { sources: compendiumSources } = useCompendium();
  const hasMatchingMonster =
    compendiumSources.flatMap(
      (source) =>
        source.data.monster?.filter(
          (monster) => monster.name === character.name
        ) ?? []
    ).length > 0;

  return (
    <div>
      <div className="flex justify-end">
        <CharacterPopUpButton
          icon={faScroll}
          title={"Skills"}
          onClick={() => togglePopUpVisible("skills")}
          popUpVisible={popUpVisible === "skills"}
        />
        <CharacterPopUpButton
          icon={faClipboard}
          title={"Notes"}
          onClick={() => togglePopUpVisible("notes")}
          popUpVisible={popUpVisible === "notes"}
        />
        <CharacterPopUpButton
          icon={faMagic}
          title={"Spells"}
          onClick={() => togglePopUpVisible("spells")}
          popUpVisible={popUpVisible === "spells"}
        />
        {hasMatchingMonster && (
          <CharacterPopUpButton
            icon={faSkull}
            title={"Combat Card"}
            onClick={() => togglePopUpVisible("combatCard")}
            popUpVisible={popUpVisible === "combatCard"}
          />
        )}
      </div>
      {popUpVisible === "notes" && <Notes character={character} />}
      {popUpVisible === "skills" && <LimitedUse character={character} />}
      {popUpVisible === "spells" && <Spells character={character} />}
      {popUpVisible === "combatCard" && <CombatCardHUD />}
    </div>
  );
}

function CharacterPopUpButton({
  icon,
  title,
  onClick,
  popUpVisible,
}: {
  icon: IconDefinition;
  title: string;
  onClick: () => void;
  popUpVisible: boolean;
}) {
  return (
    <div
      className={clsx(
        "pointer-events-auto p-2 flex items-end flex-col pb-2 cursor-pointer",
        popUpVisible ? "bg-black/40 rounded-t-md" : ""
      )}
      onClick={onClick}
    >
      <FontAwesomeIcon title={title} icon={icon} size="lg" fixedWidth />
    </div>
  );
}

function Notes({ character }: { character: RRCharacterProps }) {
  const dispatch = useServerDispatch();

  return (
    <div className="min-w-full bg-black/40 p-1 rounded pointer-events-auto">
      <TextareaInput
        placeholder="Character Notes"
        value={character.notes}
        className="text-xs p-1"
        rows={10}
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
