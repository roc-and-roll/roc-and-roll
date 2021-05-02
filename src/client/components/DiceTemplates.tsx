import clsx from "clsx";
import React, { useEffect, useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { IterableElement } from "type-fest";
import {
  diceTemplateAdd,
  diceTemplateUpdate,
  logEntryDiceRollAdd,
} from "../../shared/actions";
import {
  entries,
  RRDiceTemplate,
  RRDiceTemplateID,
  RRPlayerID,
} from "../../shared/state";
import { rrid } from "../../shared/util";
import { useMyself } from "../myself";
import { roll } from "../roll";
import {
  useOptimisticDebouncedServerUpdate,
  useServerDispatch,
  useServerState,
} from "../state";

interface RRRollPart {
  type: "modifier" | "dice";
  number: number;
}

const partToDice = (
  item: RRRollPart
): IterableElement<RRDiceTemplate["dice"]> =>
  item.type === "modifier"
    ? {
        type: "modifier",
        damageType: "fire",
        modifier: item.number,
      }
    : {
        type: "dice",
        faces: item.number,
        modified: "none",
        negated: false,
        damageType: "fire",
        diceResults: [0],
      };

export function DiceTemplates({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const myself = useMyself();
  const templates = useServerState((state) =>
    entries(state.diceTemplates).filter((t) => t.playerId === myself.id)
  );

  const newIds = useRef<RRDiceTemplateID[]>([]);

  return (
    <div
      onMouseLeave={onClose}
      className={clsx("dice-templates", { opened: open })}
    >
      <div className="dice-picker">
        <RollPart part={{ type: "dice", number: 4 }} />
        <RollPart part={{ type: "dice", number: 6 }} />
        <RollPart part={{ type: "dice", number: 8 }} />
        <RollPart part={{ type: "dice", number: 10 }} />
        <RollPart part={{ type: "dice", number: 12 }} />
        <RollPart part={{ type: "dice", number: 20 }} />
        <RollPart part={{ type: "modifier", number: 1 }} />
      </div>
      <div className="dice-templates-container">
        {templates.map((t) => (
          <DiceTemplate
            newIds={newIds}
            playerId={myself.id}
            key={t.id}
            template={t}
          />
        ))}
        <DiceTemplate newIds={newIds} playerId={myself.id} />
      </div>
    </div>
  );
}

function RollPart({ part }: { part: RRRollPart }) {
  const [, dragRef] = useDrag<RRRollPart, void, null>(() => ({
    type: "rollPart",
    item: part,
  }));

  return (
    <div ref={dragRef} className="dice-option">
      {part.type === "dice" ? "d" : "+"}
      {part.number}
    </div>
  );
}

const DiceTemplate = React.memo(function DiceTemplate({
  template,
  playerId,
  newIds,
}: {
  template?: RRDiceTemplate;
  playerId: RRPlayerID;
  newIds: React.MutableRefObject<RRDiceTemplateID[]>;
}) {
  const dispatch = useServerDispatch();

  const [name, setName] = useOptimisticDebouncedServerUpdate(
    template?.name ?? "",
    (name) =>
      template
        ? diceTemplateUpdate({ id: template.id, changes: { name } })
        : undefined,
    1000
  );

  const nameInputRef = useRef<HTMLInputElement>(null);

  const [, dropRef] = useDrop<RRRollPart, void, never>(
    () => ({
      accept: "rollPart",
      drop: (item, monitor) => {
        if (!template) {
          const id = rrid<RRDiceTemplate>();
          newIds.current.push(id);
          dispatch(
            diceTemplateAdd({
              id,
              playerId,
              rollType: "attack",
              dice: [partToDice(item)],
            })
          );
        } else {
          dispatch(
            diceTemplateUpdate({
              id: template.id,
              changes: {
                dice: [...template.dice, partToDice(item)],
              },
            })
          );
        }
      },
    }),
    [dispatch, newIds, playerId, template]
  );

  useEffect(() => {
    if (template && newIds.current.includes(template.id)) {
      nameInputRef.current?.focus();
      newIds.current = newIds.current.filter((id) => id !== template.id);
    }
  }, [newIds, template]);

  function doRoll() {
    if (template) {
      dispatch(
        logEntryDiceRollAdd({
          silent: false,
          playerId,
          payload: {
            dice: template.dice.map((d) =>
              d.type === "dice"
                ? roll({ ...d, count: d.diceResults.length })
                : d
            ),
            rollType: template.rollType,
          },
        })
      );
    }
  }

  return (
    <div
      ref={dropRef}
      onClick={doRoll}
      className={clsx("dice-template", { created: template })}
    >
      {template ? (
        <>
          <input
            ref={nameInputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {template.dice.map((p, i) => (
            <div key={i} className="dice-option">
              {p.type === "dice" ? "d" : "+"}
              {p.type === "dice" ? p.faces : p.modifier}
            </div>
          ))}
        </>
      ) : (
        "New Template"
      )}
    </div>
  );
});
