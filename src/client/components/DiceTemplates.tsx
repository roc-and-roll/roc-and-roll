import clsx from "clsx";
import React, { useEffect, useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import { IterableElement } from "type-fest";
import {
  diceTemplateAdd,
  diceTemplateUpdate,
  logEntryDiceRollAdd,
} from "../../shared/actions";
import {
  entries,
  RRDamageType,
  RRDiceTemplate,
  RRDiceTemplateID,
  RRMultipleRoll,
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
  damageType: RRDamageType;
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
  const [pickerShown, setPickerShown] = useState(false);
  const myself = useMyself();
  const templates = useServerState((state) =>
    entries(state.diceTemplates).filter((t) => t.playerId === myself.id)
  );

  const dispatch = useServerDispatch();
  const newIds = useRef<RRDiceTemplateID[]>([]);

  const addTemplateFrom = (parts: RRRollPart[]) => {
    const id = rrid<RRDiceTemplate>();
    newIds.current.push(id);
    dispatch(
      diceTemplateAdd({
        id,
        playerId: myself.id,
        rollType: "attack",
        dice: parts.map(partToDice),
      })
    );
  };

  return (
    <div
      onMouseLeave={onClose}
      className={clsx("dice-templates", { opened: open })}
    >
      {pickerShown && <DicePicker onAddTemplate={addTemplateFrom} />}
      <div className="dice-templates-container">
        <button onClick={() => setPickerShown((b) => !b)}>Picker</button>
        {templates.map((t) => (
          <DiceTemplate
            newIds={newIds}
            playerId={myself.id}
            key={t.id}
            template={t}
          />
        ))}
        {pickerShown && <DiceTemplate newIds={newIds} playerId={myself.id} />}
      </div>
    </div>
  );
}

function DicePicker({
  onAddTemplate,
}: {
  onAddTemplate: (p: RRRollPart[]) => void;
}) {
  const [templateString, setTemplateString] = useState("");

  const addFromTemplate = () => {
    const regex = /(^| *[+-] *)(?:(\d*)(d|a|i)(\d+)|(\d+))/g;
    onAddTemplate(
      [...templateString.matchAll(regex)].flatMap(
        ([_, sign, diceCount, die, dieFaces, mod]):
          | RRRollPart
          | RRRollPart[] => {
          // TODO support negative dice?
          const negated = sign?.trim() === "-";
          if (diceCount !== undefined && dieFaces !== undefined) {
            const faces = parseInt(dieFaces);
            const count = diceCount === "" ? 1 : parseInt(diceCount);
            return Array.from<RRRollPart>({ length: count }).fill({
              type: "dice",
              number: faces,
              damageType: "fire",
            });
          } else if (mod) {
            return {
              type: "modifier",
              number: parseInt(mod) * (negated ? -1 : 1),
              damageType: "fire",
            };
          }
          throw new Error();
        }
      )
    );
    setTemplateString("");
  };

  return (
    <div className="dice-picker">
      <RollPart part={{ damageType: "fire", type: "dice", number: 4 }} />
      <RollPart part={{ damageType: "fire", type: "dice", number: 6 }} />
      <RollPart part={{ damageType: "fire", type: "dice", number: 8 }} />
      <RollPart part={{ damageType: "fire", type: "dice", number: 10 }} />
      <RollPart part={{ damageType: "fire", type: "dice", number: 12 }} />
      <RollPart part={{ damageType: "fire", type: "dice", number: 20 }} />
      <RollPart part={{ damageType: "fire", type: "modifier", number: 1 }} />
      <input
        value={templateString}
        placeholder="Enter dice shorthand ..."
        onKeyPress={(e) => e.key === "Enter" && addFromTemplate()}
        onChange={(e) => setTemplateString(e.target.value)}
      />
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

  function doRoll(modified: RRMultipleRoll) {
    if (template) {
      dispatch(
        logEntryDiceRollAdd({
          silent: false,
          playerId,
          payload: {
            dice: template.dice.map((d) =>
              d.type === "dice"
                ? roll({ ...d, count: d.diceResults.length, modified })
                : d
            ),
            rollType: template.rollType,
          },
        })
      );
    }
  }

  const canMultipleRoll = template?.dice.some(
    (d) => d.type === "dice" && d.faces === 20
  );

  return (
    <div
      ref={dropRef}
      onClick={() => doRoll("none")}
      className={clsx("dice-template", { created: template })}
    >
      {template ? (
        <>
          <input
            ref={nameInputRef}
            value={name}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setName(e.target.value)}
          />
          {template.dice.map((p, i) => (
            <div key={i} className="dice-option">
              {p.type === "dice" ? "d" : "+"}
              {p.type === "dice" ? p.faces : p.modifier}
            </div>
          ))}
          {canMultipleRoll && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  doRoll("advantage");
                }}
              >
                ADV
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  doRoll("disadvantage");
                }}
              >
                DIS
              </button>
            </>
          )}
        </>
      ) : (
        "New Template"
      )}
    </div>
  );
});
