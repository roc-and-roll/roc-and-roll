import { faBook, faCompressArrowsAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import React, { useContext, useState } from "react";
import {
  characterUpdate,
  characterDeleteSpell,
  characterUpdateSpell,
} from "../../../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../../../shared/constants";
import {
  RRCharacterSpellID,
  RRCharacterSpell,
  RRCharacterID,
} from "../../../../shared/state";
import { useConfirm } from "../../../dialog-boxes";
import { useServerDispatch } from "../../../state";
import { Dialog, DialogTitle, DialogContent } from "../../Dialog";
import { QuickReferenceContext } from "../../quickReference/QuickReferenceWrapper";
import { Button } from "../../ui/Button";
import { SmartIntegerInput } from "../../ui/TextInput";
import { RRCharacterProps } from "./Character";

export function Spells({ character }: { character: RRCharacterProps }) {
  return (
    <div className="min-w-full mt-2 bg-black/25 p-2 rounded pointer-events-auto select-none overflow-y-auto max-h-72">
      {character.spells.length < 1 && (
        <em>No spells yet. Add some from the Quick Reference.</em>
      )}
      {buildSpells({
        character,
        prepared: true,
      })}
      {character.spells.some((spell) => spell.prepared) &&
        character.spells.some((spell) => !spell.prepared) && (
          <div className="border-t-2"></div>
        )}
      {buildSpells({
        character,
        prepared: false,
      })}
    </div>
  );
}

function buildSpells({
  character,
  prepared,
}: {
  character: RRCharacterProps;
  prepared: boolean;
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
              .map((spell: RRCharacterSpell, index) => (
                <Spell key={index} spell={spell} character={character} />
              ))}
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
              character.currentlyConcentratingOn
                ? `This will end your concentration on ${character.currentlyConcentratingOn.name}.`
                : ""
            }`
          )
        ) {
          dispatch(
            characterUpdate({
              id: character.id,
              changes: {
                currentlyConcentratingOn: {
                  roundsLeft: spell.concentrationRounds,
                  name: spell.name,
                },
              },
            })
          );
        }
      }}
      fixedWidth
      icon={faCompressArrowsAlt}
      className="h-4 self-center mr-1 cursor-pointer"
    />
  );
}

function Spell({
  spell,
  character,
}: {
  spell: RRCharacterSpell;
  character: RRCharacterProps;
}) {
  const { setOpen, setSearchString } = useContext(QuickReferenceContext);
  const openSpellReference = (spellName: string) => {
    setOpen(true);
    setSearchString(spellName);
  };
  const dispatch = useServerDispatch();
  const [settingsOpen, setSettingsOpen] = useState(false);

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
    <div
      key={spell.id}
      className="flex flex-row justify-between cursor-pointer"
    >
      <SettingsDialog
        onClose={() => setSettingsOpen(false)}
        open={settingsOpen}
        spell={spell}
        characterId={character.id}
      />
      {spell.concentrationRounds > 0 && (
        <ConcentrationIcon spell={spell} character={character} />
      )}
      <p
        className="flex-grow"
        onClick={() => openSpellReference(spell.name)}
        onContextMenu={async (e) => {
          e.preventDefault();
          setSettingsOpen(true);
        }}
      >
        {spell.name}{" "}
        {spell.isRitual && (
          <FontAwesomeIcon icon={faBook} className="text-xs" />
        )}
      </p>
      <input
        type="checkbox"
        disabled={spell.alwaysPrepared}
        checked={spell.prepared}
        onChange={(event) => togglePrepareSpell(event.target.checked, spell.id)}
      />
    </div>
  );
}

export function SettingsDialog({
  spell,
  open,
  characterId,
  onClose,
}: {
  spell: RRCharacterSpell;
  open: boolean;
  characterId: RRCharacterID;
  onClose: () => void;
}) {
  const dispatch = useServerDispatch();
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Settings for {spell.name}</DialogTitle>
      <DialogContent>
        <label>
          Ritual Spell:{" "}
          <input
            type="checkbox"
            checked={spell.isRitual}
            onChange={(e) =>
              dispatch({
                actions: [
                  characterUpdateSpell({
                    id: characterId,
                    spell: {
                      id: spell.id,
                      changes: { isRitual: e.target.checked },
                    },
                  }),
                ],
                optimisticKey: "hasHeroPoint",
                syncToServerThrottle: 0,
              })
            }
          />
        </label>
        <label>
          Always Prepared:{" "}
          <input
            type="checkbox"
            checked={spell.alwaysPrepared}
            onChange={(e) =>
              dispatch({
                actions: [
                  characterUpdateSpell({
                    id: characterId,
                    spell: {
                      id: spell.id,
                      changes: {
                        alwaysPrepared: e.target.checked,
                        prepared: e.target.checked || spell.prepared,
                      },
                    },
                  }),
                ],
                optimisticKey: "hasHeroPoint",
                syncToServerThrottle: 0,
              })
            }
          />
        </label>
        <label>
          Concentration Rounds:{" "}
          <SmartIntegerInput
            value={spell.concentrationRounds}
            min={0}
            placeholder="Concentration Rounds"
            onChange={(concentrationRounds) =>
              dispatch({
                actions: [
                  characterUpdateSpell({
                    id: characterId,
                    spell: {
                      id: spell.id,
                      changes: { concentrationRounds },
                    },
                  }),
                ],
                optimisticKey: "concentrationRounds",
                syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
              })
            }
          />
        </label>
        <Button
          className="red"
          onClick={() =>
            dispatch(
              characterDeleteSpell({ id: characterId, spellId: spell.id })
            )
          }
        >
          Delete
        </Button>
      </DialogContent>
    </Dialog>
  );
}
