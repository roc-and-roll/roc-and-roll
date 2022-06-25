import clsx from "clsx";
import React, { useContext } from "react";
import { characterUpdateSpell } from "../../../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../../../shared/constants";
import { RRCharacterSpellID, RRCharacterSpell } from "../../../../shared/state";
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
                    <p onClick={() => openSpellReference(spell.name)}>
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
