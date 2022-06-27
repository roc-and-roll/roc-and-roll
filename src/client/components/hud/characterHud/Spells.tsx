import { faCompressArrowsAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import React, { useContext } from "react";
import {
  characterUpdate,
  characterUpdateSpell,
} from "../../../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../../../shared/constants";
import { RRCharacterSpellID, RRCharacterSpell } from "../../../../shared/state";
import { useConfirm } from "../../../dialog-boxes";
import { useServerDispatch } from "../../../state";
import { QuickReferenceContext } from "../../quickReference/QuickReferenceWrapper";
import { RRCharacterProps } from "./Character";

export function Spells({ character }: { character: RRCharacterProps }) {
  const dispatch = useServerDispatch();
  const { setOpen, setSearchString } = useContext(QuickReferenceContext);

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

  const openSpellReference = (spellName: string) => {
    setOpen(true);
    setSearchString(spellName);
  };
  return (
    <div className="min-w-full mt-2 bg-black/25 p-2 rounded pointer-events-auto select-none overflow-y-auto max-h-72">
      {character.spells.length < 1 && (
        <em>No spells yet. Add some from the Quick Reference.</em>
      )}
      {buildSpells({
        character,
        prepared: true,
        togglePrepareSpell,
        openSpellReference,
      })}
      {character.spells.some((spell) => spell.prepared) &&
        character.spells.some((spell) => !spell.prepared) && (
          <div className="border-t-2"></div>
        )}
      {buildSpells({
        character,
        prepared: false,
        togglePrepareSpell,
        openSpellReference,
      })}
    </div>
  );
}

function buildSpells({
  character,
  prepared,
  togglePrepareSpell,
  openSpellReference,
}: {
  character: RRCharacterProps;
  prepared: boolean;
  togglePrepareSpell: (prepared: boolean, spellId: RRCharacterSpellID) => void;
  openSpellReference: (spellName: string) => void;
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
                    {spell.concentrationRounds > 0 && (
                      <ConcentrationIcon spell={spell} character={character} />
                    )}
                    <p
                      onClick={() => openSpellReference(spell.name)}
                      className="flex-grow"
                    >
                      {spell.name}
                    </p>
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

function ConcentrationIcon({
  spell,
  character,
}: {
  spell: RRCharacterSpell;
  character: RRCharacterProps;
}) {
  const confirm = useConfirm();
  const dispatch = useServerDispatch();

  return (
    <FontAwesomeIcon
      title={`Concentration: ${spell.concentrationRounds} rounds`}
      onClick={async () => {
        if (
          await confirm(
            `Start concentrating on ${spell.name}? ${
              character.currentlyConcentratingOnSpell
                ? `This will end your concentration on ${
                    character.spells.filter(
                      (s) =>
                        character.currentlyConcentratingOnSpell!.spellId ===
                        s.id
                    )[0]!.name
                  }.`
                : ""
            }`
          )
        ) {
          dispatch((state) => {
            return {
              actions: [
                characterUpdate({
                  id: character.id,
                  changes: {
                    currentlyConcentratingOnSpell: {
                      roundsLeft: spell.concentrationRounds,
                      spellId: spell.id,
                    },
                  },
                }),
              ],
              optimisticKey: "concentration",
              syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
            };
          });
        }
      }}
      fixedWidth
      icon={faCompressArrowsAlt}
      className="h-4 self-center mr-1 cursor-pointer"
    />
  );
}
