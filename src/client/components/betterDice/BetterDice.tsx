import clsx from "clsx";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  logEntryDiceRollAdd,
  characterAddDie,
  characterUpdateDie,
} from "../../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../../shared/constants";
import {
  RRCharacterID,
  RRDiceTemplatePart,
  RRDiceTemplatePartID,
} from "../../../shared/state";
import { rrid } from "../../../shared/util";
import { RRDie } from "../../../shared/validation";
import { evaluateDiceTemplatePart } from "../../diceUtils";
import { useMyActiveCharacters, useMyProps } from "../../myself";
import { useServerDispatch } from "../../state";
import { Button } from "../ui/Button";

function Die({
  die: { x, y, id },
  characterId,
  children,
  selectedOffset,
  onSelect,
  lastSelectedTimesRef,
}: {
  die: RRDie;
  characterId: RRCharacterID;
  children: React.ReactNode;
  selectedOffset: number;
  onSelect: (id: RRDiceTemplatePartID) => void;
  lastSelectedTimesRef: React.MutableRefObject<
    Record<RRDiceTemplatePartID, Date>
  >;
}) {
  const [dragging, setDragging] = useState(false);
  const last = useRef({ x: 0, y: 0, moved: false });
  const dispatch = useServerDispatch();

  const doSelect = useCallback(() => {
    const selectedTime = lastSelectedTimesRef.current[id];
    if (!selectedTime || new Date().getTime() - selectedTime.getTime() > 1000) {
      onSelect(id);
    }
  }, [id, onSelect, lastSelectedTimesRef]);

  useEffect(() => {
    if (dragging) {
      const move = function (e: MouseEvent) {
        e.stopPropagation();
        dispatch({
          actions: [
            characterUpdateDie({
              die: {
                id,
                changes: {
                  x: x + e.clientX - last.current.x,
                  y: y + e.clientY - last.current.y,
                },
              },
              id: characterId,
            }),
          ],
          syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
          optimisticKey: "characterUpdateDie",
        });
        last.current.x = e.clientX;
        last.current.y = e.clientY;
        last.current.moved = true;
      };
      const up = function (e: MouseEvent) {
        e.stopPropagation();
        if (!last.current.moved) {
          doSelect();
        }
        setDragging(false);
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
      return () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };
    }
  }, [characterId, dispatch, dragging, id, doSelect, x, y]);

  return (
    <div
      onMouseDown={(e) => {
        e.stopPropagation();
        last.current.x = e.clientX;
        last.current.y = e.clientY;
        last.current.moved = false;
        setDragging(true);
      }}
      onMouseMove={(e) => {
        if (e.shiftKey) {
          doSelect();
        }
      }}
      style={{
        transform:
          selectedOffset < 0
            ? `translate(${x}px, ${y}px)`
            : `translate(${selectedOffset * 32}px, 0px)`,
        position: "absolute",
        cursor: "pointer",
        width: "22px",
        height: "22px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      className={clsx(
        "bg-rr-500 select-none",
        !dragging && "transition-transform"
      )}
    >
      {children}
    </div>
  );
}

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
const empty: RRDie[] = [];
const MAX_DIST = 30;

const allAffected = (origin: RRDie, candidates: RRDie[]) => {
  let selected: RRDie[] = [origin];
  candidates = candidates.filter((c) => c.id !== origin.id);

  let newSelected: RRDie[] = [];
  do {
    newSelected = candidates.filter((other) =>
      selected.some((s) => dist(s, other) < MAX_DIST)
    );
    selected = [...selected, ...newSelected];
    candidates = candidates.filter((other) => !selected.includes(other));
  } while (newSelected.length > 0);

  return selected;
};

export function BetterDice() {
  const { id: myId } = useMyProps("id");
  const character = useMyActiveCharacters(
    "dice",
    "id",
    "attributes",
    "stats"
  )[0];
  const dispatch = useServerDispatch();
  const [selectedIds, setSelectedIds] = useState<RRDiceTemplatePartID[]>([]);
  const lastSelectedTimesRef = useRef<Record<RRDiceTemplatePartID, Date>>({});

  const dice = character?.dice ?? empty;
  const onSelectDie = useCallback(
    (id: RRDiceTemplatePartID) => {
      setSelectedIds((ids) => {
        if (ids.includes(id)) {
          lastSelectedTimesRef.current[id] = new Date();
          return ids.filter((dieId) => dieId !== id);
        }

        const die = dice.find((die) => die.id === id)!;
        const newSelected = allAffected(
          die,
          dice.filter((d) => !ids.includes(d.id))
        ).map((dice) => dice.id);
        for (const selected of newSelected) {
          lastSelectedTimesRef.current[selected] = new Date();
        }

        return [...ids, ...newSelected];
      });
    },
    [dice]
  );

  if (!character) return null;

  const doRoll = (crit: boolean = false) => {
    const parts = selectedIds.flatMap((id) =>
      evaluateDiceTemplatePart(
        dice.find((d) => d.id === id)!,
        "none",
        crit,
        character
      )
    );
    if (parts.length < 1) return;

    dispatch(
      logEntryDiceRollAdd({
        silent: false,
        playerId: myId,
        payload: {
          tooltip: "",
          rollType: "attack", // TODO
          rollName: "",
          diceRollTree:
            parts.length === 1
              ? parts[0]!
              : {
                  type: "term",
                  operator: "+",
                  operands: parts,
                },
          characterIds: [character.id],
        },
      })
    );

    setSelectedIds([]);
  };

  const roll = () => {
    doRoll(false);
  };

  const addDie = () => {
    dispatch(
      characterAddDie({
        id: character.id,
        die: {
          x: 0,
          y: 0,
          type: "dice",
          modified: "none",
          faces: 6,
          count: 1,
          damage: { type: null },
          id: rrid<RRDiceTemplatePart>(),
          negated: false,
        },
      })
    );
  };

  return (
    <div
      style={{
        bottom: 0,
        left: "72px",
        height: "200px",
        width: "400px",
        position: "absolute",
      }}
      className="bg-rr-800"
    >
      <Button onClick={addDie}>Add Die</Button>
      {selectedIds.length > 0 && <Button onClick={roll}>Roll</Button>}
      {character.dice.map((die) => {
        switch (die.type) {
          case "dice":
            return (
              <Die
                lastSelectedTimesRef={lastSelectedTimesRef}
                key={die.id}
                selectedOffset={selectedIds.indexOf(die.id)}
                characterId={character.id}
                die={die}
                onSelect={onSelectDie}
              >
                {die.faces}
              </Die>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
