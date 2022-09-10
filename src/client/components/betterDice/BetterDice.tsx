import clsx from "clsx";
import React, {
  useMemo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  logEntryDiceRollAdd,
  characterAddDie,
  characterUpdateDie,
  characterRemoveDie,
} from "../../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../../shared/constants";
import {
  RRDiceTemplatePart,
  RRDiceTemplatePartID,
  RRDiceTemplatePartWithDamage,
  colorForDamageType,
  RRCharacter,
  RRDiceTemplatePartLabel,
} from "../../../shared/state";
import { contrastColor } from "../../util";
import { RRDie } from "../../../shared/validation";
import {
  evaluateDiceTemplatePart,
  generateSavingThrowTemplates,
  generateSkillTemplates,
} from "../../diceUtils";
import { useMyActiveCharacters, useMyProps } from "../../myself";
import { useServerDispatch } from "../../state";
import { DamageTypeEditor } from "../diceTemplates/DiceTemplateEditors";
import { Popover } from "../Popover";
import { Button } from "../ui/Button";
import { D10, D12, D20, D4, D6, D8 } from "./Dice";
import { DicePicker } from "../diceTemplates/DiceTemplates";
import { useDrop } from "react-dnd";
import composeRefs from "@seznam/compose-react-refs";
import { usePrompt } from "../../dialog-boxes";

function Die({
  die,
  character,
  selectedOffset,
  onSelect,
  lastSelectedTimesRef,
}: {
  die: RRDie;
  character: Pick<RRCharacter, "id">;
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
    const selectedTime = lastSelectedTimesRef.current[die.id];
    if (!selectedTime || new Date().getTime() - selectedTime.getTime() > 1000) {
      onSelect(die.id);
    }
  }, [die.id, onSelect, lastSelectedTimesRef]);

  useEffect(() => {
    if (dragging) {
      const move = function (e: MouseEvent) {
        e.stopPropagation();
        dispatch({
          actions: [
            characterUpdateDie({
              die: {
                id: die.id,
                changes: {
                  x: die.x + e.clientX - last.current.x,
                  y: die.y + e.clientY - last.current.y,
                },
              },
              id: character.id,
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
  }, [character.id, dispatch, dragging, die.id, doSelect, die.x, die.y]);

  const hasDamageType =
    die.type === "dice" ||
    die.type === "linkedModifier" ||
    die.type === "linkedProficiency" ||
    die.type === "linkedStat" ||
    die.type === "modifier";

  const iconForFaces = (faces: number, color: string) => {
    switch (faces) {
      case 20:
        return <D20 color={color} />;
      case 12:
        return <D12 color={color} />;
      case 10:
        return <D10 color={color} />;
      case 8:
        return <D8 color={color} />;
      case 6:
        return <D6 color={color} />;
      case 4:
        return <D4 color={color} />;
    }
  };

  const prompt = usePrompt();

  const editLabel = async () => {
    const label = await prompt(
      "New Label?",
      (die as RRDiceTemplatePartLabel).label
    );
    if (label)
      dispatch(
        characterUpdateDie({
          die: {
            id: die.id,
            changes: { label },
          },
          id: character.id,
        })
      );
  };

  const icon = () => {
    switch (die.type) {
      case "dice":
        return iconForFaces(
          die.faces,
          hasDamageType ? colorForDamageType(die.damage.type) : "#fff"
        );
      case "modifier":
        return (
          <span className="text-white leading-none">
            {die.number >= 0 && "+"}
            {die.number}
          </span>
        );
      case "linkedStat":
        return (
          <span className="text-white leading-none italic">{die.name}</span>
        );
      case "linkedModifier":
        return (
          <span className="text-white leading-none italic">{die.name}</span>
        );
      case "linkedProficiency":
        return <span className="text-white leading-none italic">Prof</span>;
      case "label":
        return (
          <span
            onContextMenu={(e) => {
              e.preventDefault();
              void editLabel();
            }}
            className="text-white leading-none"
          >
            {die.label}
          </span>
        );
      case "template":
        return null;
    }
  };

  return (
    <div
      onMouseDown={(e) => {
        if (e.button !== 0) return;
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
            ? `translate(${die.x}px, ${die.y}px)`
            : `translate(${selectedOffset * 32}px, 0px)`,
        position: "absolute",
        cursor: "pointer",
        width: "22px",
        height: "22px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: hasDamageType
          ? contrastColor(colorForDamageType(die.damage.type))
          : "#000",
      }}
      className={clsx("select-none", !dragging && "transition-transform")}
    >
      {icon()}
    </div>
  );
}

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
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
    "stats",
    "savingThrows",
    "skills"
  )[0];
  const dispatch = useServerDispatch();
  const [selectedIds, setSelectedIds] = useState<RRDiceTemplatePartID[]>([]);
  const lastSelectedTimesRef = useRef<Record<RRDiceTemplatePartID, Date>>({});

  const dice: RRDie[] = useMemo(
    () =>
      !character
        ? []
        : [
            ...character.dice,
            ...generateSavingThrowTemplates([character]).flatMap(
              (templates, yOffset) => {
                const template = templates.templates[0]!.template;
                const y = yOffset * 32 + 24;
                const labelId: RRDiceTemplatePartID = `RRID/diceTemplatePart/${template.name}`;
                return [
                  {
                    type: "label" as const,
                    label: template.name,
                    x: 0,
                    y,
                    id: labelId,
                  },
                  ...template.parts.flatMap((die, x) => ({
                    ...die,
                    x: (x + 1) * 22,
                    y,
                  })),
                ];
              }
            ),
            ...generateSkillTemplates([character]).flatMap(
              (templates, yOffset) => {
                const template = templates.templates[0]!.template;
                const y = (yOffset % 9) * 32 + 24;
                const x = 100 + Math.floor(yOffset / 9) * 100;
                const labelId: RRDiceTemplatePartID = `RRID/diceTemplatePart/${template.name}`;
                return [
                  {
                    type: "label" as const,
                    label: template.name,
                    x,
                    y,
                    id: labelId,
                  },
                  ...template.parts.flatMap((die, xOffset) => ({
                    ...die,
                    x: x + (xOffset + 1) * 22,
                    y,
                  })),
                ];
              }
            ),
          ],
    [character]
  );

  const selectedDice = useMemo(
    () => dice.filter((d) => selectedIds.includes(d.id)),
    [dice, selectedIds]
  );

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

  const doRoll = useCallback(
    (crit: boolean = false) => {
      const parts = selectedIds.flatMap((id) =>
        evaluateDiceTemplatePart(
          dice.find((d) => d.id === id)!,
          "none",
          crit,
          character
        )
      );
      const rollName = selectedDice
        .filter((p) => p.type === "label")
        .map((p) => (p as RRDiceTemplatePartLabel).label)
        .join(" ");
      if (parts.length < 1) return;

      dispatch(
        logEntryDiceRollAdd({
          silent: false,
          playerId: myId,
          payload: {
            tooltip: rollName,
            rollType: "attack", // TODO
            rollName,
            diceRollTree:
              parts.length === 1
                ? parts[0]!
                : {
                    type: "term",
                    operator: "+",
                    operands: parts,
                  },
            characterIds: [character!.id],
          },
        })
      );

      setSelectedIds([]);
    },
    [character, dice, dispatch, myId, selectedDice, selectedIds]
  );

  const clear = () => {
    setSelectedIds([]);
  };

  const remove = () => {
    dispatch({
      actions: selectedIds.map((id) =>
        characterRemoveDie({ id: character!.id, dieId: id })
      ),
      syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
      optimisticKey: "characterRemoveDie",
    });
    setSelectedIds([]);
  };

  const roll = useCallback(() => {
    doRoll(false);
  }, [doRoll]);

  useEffect(() => {
    const keyUp = function (e: KeyboardEvent) {
      if (e.key === "Shift") roll();
    };
    window.addEventListener("keyup", keyUp);
    return () => window.removeEventListener("keyup", keyUp);
  }, [roll]);

  const [menuVisible, setMenuVisible] = useState(false);
  const [addDiceVisible, setAddDiceVisible] = useState(false);

  const dropContainerRef = useRef<HTMLDivElement>(null);

  const [, dropRef] = useDrop<RRDiceTemplatePart, void, never>(
    () => ({
      accept: ["diceTemplatePart"],
      drop: (item, monitor) => {
        if (!character) return;
        const topLeft = dropContainerRef.current!.getBoundingClientRect();
        const dropPosition = monitor.getClientOffset();
        const x = dropPosition!.x - topLeft.x - 10;
        const y = dropPosition!.y - topLeft.y - 10;

        const action = characterAddDie({
          id: character.id,
          die: { ...item, x, y },
        });
        dispatch(action);
      },
      canDrop: (_item, monitor) => monitor.isOver({ shallow: true }),
    }),
    [dispatch, character]
  );

  const ref = composeRefs<HTMLDivElement>(dropContainerRef, dropRef);

  if (!character) return <span>No character selected</span>;

  return (
    <div>
      {addDiceVisible && (
        <div className="dice-templates" style={{ maxWidth: "400px" }}>
          <DicePicker useBetterDice />
        </div>
      )}
      <div className="flex">
        <Button onClick={() => setAddDiceVisible((v) => !v)}>Add Dice</Button>
        {selectedIds.length > 0 && <Button onClick={clear}>Clear</Button>}
        {selectedIds.length > 0 && <Button onClick={roll}>Roll</Button>}
        {selectedIds.length > 0 && (
          <Button onClick={() => doRoll(true)}>Crit!</Button>
        )}
        <div style={{ flexGrow: 1 }}></div>
        {selectedIds.length > 0 && <Button onClick={remove}>Delete</Button>}
        {selectedIds.length > 0 && (
          <Popover
            visible={menuVisible}
            onClickOutside={() => setMenuVisible(false)}
            interactive
            placement="top"
            content={
              <div onClick={(e) => e.stopPropagation()}>
                {selectedDice.every(
                  (part) =>
                    part.type === "dice" ||
                    part.type === "linkedModifier" ||
                    part.type === "linkedProficiency" ||
                    part.type === "linkedStat" ||
                    part.type === "modifier"
                ) && (
                  <DamageTypeEditor
                    parts={selectedDice as RRDiceTemplatePartWithDamage[]}
                    characterId={character.id}
                  />
                )}
              </div>
            }
          >
            <Button onClick={() => setMenuVisible((visible) => !visible)}>
              Edit
            </Button>
          </Popover>
        )}
      </div>
      <div
        ref={ref}
        className="text-[0.6rem]"
        style={{
          height: "300px",
          width: "400px",
        }}
      >
        <BuiltInTemplates
          selectedIds={selectedIds}
          onSelect={onSelectDie}
          character={character}
          lastSelectedTimesRef={lastSelectedTimesRef}
        />
        {dice.map((die) => {
          return (
            <Die
              lastSelectedTimesRef={lastSelectedTimesRef}
              key={die.id}
              selectedOffset={selectedIds.indexOf(die.id)}
              character={character}
              die={die}
              onSelect={onSelectDie}
            />
          );
        })}
      </div>
    </div>
  );
}

function BuiltInTemplates({
  character,
  selectedIds,
  onSelect,
  lastSelectedTimesRef,
}: {
  character: Pick<
    RRCharacter,
    "id" | "attributes" | "savingThrows" | "stats" | "skills"
  >;
  selectedIds: RRDiceTemplatePartID[];
  onSelect: (id: RRDiceTemplatePartID) => void;
  lastSelectedTimesRef: React.MutableRefObject<
    Record<RRDiceTemplatePartID, Date>
  >;
}) {
  return <></>;
}
