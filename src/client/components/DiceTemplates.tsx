import clsx from "clsx";
import React, { useEffect, useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import {
  diceTemplateAdd,
  diceTemplateUpdate,
  logEntryDiceRollAdd,
} from "../../shared/actions";
import {
  byId,
  damageTypes,
  entries,
  multipleRollValues,
  RRDamageType,
  RRDice,
  RRDiceTemplate,
  RRDiceTemplateID,
  RRDiceTemplatePart,
  RRDiceTemplatePartDice,
  RRDiceTemplatePartModifier,
  RRDiceTemplatePartWithDamage,
  RRModifier,
  RRMultipleRoll,
} from "../../shared/state";
import { assertNever, rrid } from "../../shared/util";
import { useMyself } from "../myself";
import { roll } from "../roll";
import {
  useOptimisticDebouncedServerUpdate,
  useServerDispatch,
  useServerState,
} from "../state";
import { Popover } from "./Popover";

export function DiceTemplates({ open }: { open: boolean }) {
  const [pickerShown, setPickerShown] = useState(false);
  const myself = useMyself();
  const templates = useServerState((state) =>
    entries(state.diceTemplates).filter((t) => t.playerId === myself.id)
  );

  const dispatch = useServerDispatch();
  const newIds = useRef<RRDiceTemplateID[]>([]);

  const [, dropRef] = useDrop<RRDiceTemplatePart, void, never>(
    () => ({
      accept: "diceTemplatePart",
      drop: (item, monitor) => {
        const id = rrid<RRDiceTemplate>();
        newIds.current.push(id);
        dispatch(
          diceTemplateAdd({
            id,
            playerId: myself.id,
            name: "",
            notes: "",
            rollType: "attack",
            parts: [item],
          })
        );
      },
      canDrop: (item, monitor) => monitor.isOver({ shallow: true }),
    }),
    [dispatch, myself.id]
  );

  return (
    <div className={clsx("dice-templates", { opened: open })} ref={dropRef}>
      {pickerShown && <DicePicker />}
      <div className="dice-templates-container">
        <button onClick={() => setPickerShown((b) => !b)}>Picker</button>
        {templates.map((t) => (
          <DiceTemplate newIds={newIds} key={t.id} templateId={t.id} />
        ))}
      </div>
    </div>
  );
}

function DicePicker() {
  const makeDicePart = (faces: number) =>
    ({
      damage: { type: null, modifiers: [] },
      type: "dice",
      faces,
      count: 1,
      negated: false,
      modified: "none",
    } as const);

  return (
    <div className="dice-picker">
      <PickerDiceTemplatePart part={makeDicePart(4)} />
      <PickerDiceTemplatePart part={makeDicePart(6)} />
      <PickerDiceTemplatePart part={makeDicePart(8)} />
      <PickerDiceTemplatePart part={makeDicePart(10)} />
      <PickerDiceTemplatePart part={makeDicePart(12)} />
      <PickerDiceTemplatePart part={makeDicePart(20)} />
      <PickerDiceTemplatePart
        part={{
          type: "modifier",
          damage: { type: null, modifiers: [] },
          number: 1,
        }}
      />
    </div>
  );
}

function PickerDiceTemplatePart({ part }: { part: RRDiceTemplatePart }) {
  const [, dragRef] = useDrag<RRDiceTemplatePart, void, null>(() => ({
    type: "diceTemplatePart",
    item: part,
  }));

  const newIds = useRef([]);

  return <DiceTemplatePart ref={dragRef} newIds={newIds} part={part} />;
}

const DiceTemplate = React.memo(function DiceTemplate({
  templateId,
  newIds,
}: {
  templateId: RRDiceTemplateID;
  newIds: React.MutableRefObject<RRDiceTemplateID[]>;
}) {
  const template = useServerState((state) =>
    byId(state.diceTemplates.entities, templateId)
  );

  if (!template) {
    return null;
  }

  return <DiceTemplateInner template={template} newIds={newIds} />;
});

function DiceTemplateInner({
  template,
  newIds,
}: {
  template: RRDiceTemplate;
  newIds: React.MutableRefObject<RRDiceTemplateID[]>;
}) {
  const myself = useMyself();
  const dispatch = useServerDispatch();

  const [name, setName] = useOptimisticDebouncedServerUpdate(
    template.name,
    (name) =>
      template
        ? diceTemplateUpdate({ id: template.id, changes: { name } })
        : undefined,
    1000
  );

  const [notes, setNotes] = useOptimisticDebouncedServerUpdate(
    template.notes,
    (notes) =>
      template
        ? diceTemplateUpdate({ id: template.id, changes: { notes } })
        : undefined,
    1000
  );

  const nameInputRef = useRef<HTMLInputElement>(null);

  const [, dropRef] = useDrop<RRDiceTemplatePart, void, never>(
    () => ({
      accept: "diceTemplatePart",
      drop: (item) => {
        dispatch(
          diceTemplateUpdate({
            id: template.id,
            changes: {
              parts: [...template.parts, item],
            },
          })
        );
      },
    }),
    [dispatch, template]
  );

  useEffect(() => {
    if (template && newIds.current.includes(template.id)) {
      nameInputRef.current?.focus();
      newIds.current = newIds.current.filter((id) => id !== template.id);
    }
  }, [newIds, template]);

  function evaluateDiceTemplatePart(
    part: RRDiceTemplatePart
  ): Array<RRDice | RRModifier> {
    switch (part.type) {
      case "dice":
        return [roll(part)];
      case "linkedModifier":
        return [
          {
            type: "modifier",
            // TODO
            modifier: 0,
            damageType: part.damage,
          },
        ];
      case "modifier":
        return [
          {
            type: "modifier",
            modifier: part.number,
            damageType: part.damage,
          },
        ];
      case "template":
        // TODO
        return [
          {
            type: "modifier",
            modifier: 0,
            damageType: {
              type: null,
              modifiers: [],
            },
          },
        ];
      // return evaluateDiceTemplatePart(part.templateId);
      default:
        assertNever(part);
    }
  }

  function doRoll(modified: RRMultipleRoll) {
    // TODO: Use modified
    if (template) {
      dispatch(
        logEntryDiceRollAdd({
          silent: false,
          playerId: myself.id,
          payload: {
            rollType: "attack", // TODO
            dice: template.parts.flatMap(evaluateDiceTemplatePart),
          },
        })
      );
    }
  }

  // TODO
  const canMultipleRoll = template.parts.some(
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
          <textarea
            onClick={(e) => e.stopPropagation()}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {template.parts.map((part, i) => (
            <DiceTemplatePartMenuWrapper
              template={template}
              key={i}
              part={part}
            >
              <DiceTemplatePart part={part} newIds={newIds} />
            </DiceTemplatePartMenuWrapper>
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
}

function DamageTypeEditor({
  part,
  onChange,
}: {
  part: RRDiceTemplatePartWithDamage;
  onChange: (oldPart: RRDiceTemplatePart, newPart: RRDiceTemplatePart) => void;
}) {
  const [damageType, setDamageType] = useOptimisticDebouncedServerUpdate<
    RRDamageType["type"]
  >(
    part.damage.type,
    (type) => {
      onChange(part, { ...part, damage: { type, modifiers: [] } });
      return undefined;
    },
    1000
  );

  return (
    <div>
      Damage Type:
      <select
        value={damageType ?? ""}
        onChange={(e) => setDamageType(e.target.value as RRDamageType["type"])}
      >
        {damageTypes.map((t) => (
          <option key={t ?? ""} value={t ?? ""}>
            {t ?? ""}
          </option>
        ))}
      </select>
    </div>
  );
}

function DiceMultipleRollEditor({
  part,
  onChange,
}: {
  part: RRDiceTemplatePartDice;
  onChange: (oldPart: RRDiceTemplatePart, newPart: RRDiceTemplatePart) => void;
}) {
  const [
    multiple,
    setMultiple,
  ] = useOptimisticDebouncedServerUpdate<RRMultipleRoll>(
    part.modified,
    (multiple) => {
      onChange(part, { ...part, modified: multiple });
      return undefined;
    },
    1000
  );

  return (
    <div>
      Multiple:
      <select
        value={multiple ?? ""}
        onChange={(e) => setMultiple(e.target.value as RRMultipleRoll)}
      >
        {multipleRollValues.map((t) => (
          <option key={t ?? ""} value={t ?? ""}>
            {t ?? ""}
          </option>
        ))}
      </select>
    </div>
  );
}

function DiceCountEditor({
  part,
  onChange,
}: {
  part: RRDiceTemplatePartDice;
  onChange: (oldPart: RRDiceTemplatePart, newPart: RRDiceTemplatePart) => void;
}) {
  const [count, setCount] = useOptimisticDebouncedServerUpdate<string>(
    part.count.toString(),
    (count) => {
      if (!isNaN(parseInt(count)))
        onChange(part, { ...part, count: parseInt(count) });
      return undefined;
    },
    1000
  );

  return (
    <div>
      Count:
      <input value={count} onChange={(e) => setCount(e.target.value)} />
    </div>
  );
}

function ModifierNumberEditor({
  part,
  onChange,
}: {
  part: RRDiceTemplatePartModifier;
  onChange: (oldPart: RRDiceTemplatePart, newPart: RRDiceTemplatePart) => void;
}) {
  const [count, setCount] = useOptimisticDebouncedServerUpdate<string>(
    part.number.toString(),
    (modifier) => {
      if (!isNaN(parseInt(modifier)))
        onChange(part, { ...part, number: parseInt(modifier) });
      return undefined;
    },
    1000
  );

  return (
    <div>
      Modifier:
      <input value={count} onChange={(e) => setCount(e.target.value)} />
    </div>
  );
}

const DiceTemplatePartMenuWrapper: React.FC<{
  part: RRDiceTemplatePart;
  template: RRDiceTemplate;
}> = ({ part, template, children }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const dispatch = useServerDispatch();

  const applyChange = (
    oldPart: RRDiceTemplatePart,
    newPart: RRDiceTemplatePart
  ) => {
    dispatch(
      diceTemplateUpdate({
        changes: {
          parts: template.parts.map((p) => (p === oldPart ? newPart : p)),
        },
        id: template.id,
      })
    );
  };

  return (
    <Popover
      content={
        <div onClick={(e) => e.stopPropagation()}>
          {(part.type === "dice" ||
            part.type === "linkedModifier" ||
            part.type === "modifier") && (
            <DamageTypeEditor onChange={applyChange} part={part} />
          )}
          {part.type === "dice" && (
            <DiceCountEditor onChange={applyChange} part={part} />
          )}
          {part.type === "dice" && (
            <DiceMultipleRollEditor onChange={applyChange} part={part} />
          )}
          {part.type === "modifier" && (
            <ModifierNumberEditor onChange={applyChange} part={part} />
          )}
        </div>
      }
      visible={menuVisible}
      onClickOutside={() => setMenuVisible(false)}
      interactive
      placement="top"
    >
      <div
        onContextMenu={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setMenuVisible(true);
        }}
        onClick={(e) => e.button === 2 && e.stopPropagation()}
      >
        {children}
      </div>
    </Popover>
  );
};

const DiceTemplatePart = React.forwardRef<
  HTMLDivElement,
  {
    part: RRDiceTemplatePart;
    newIds: React.MutableRefObject<RRDiceTemplateID[]>;
  }
>(function DiceTemplatePart({ part, newIds }, ref) {
  let content: JSX.Element;

  switch (part.type) {
    case "modifier":
      content = (
        <div className="dice-option">
          {part.number >= 0 && "+"}
          {part.number}
        </div>
      );
      break;
    case "linkedModifier":
      content = <div className="dice-option">{part.name}</div>;
      break;
    case "dice":
      content = (
        <div className="dice-option">
          {part.count}d{part.faces}
        </div>
      );
      break;
    case "template":
      content = <DiceTemplate templateId={part.templateId} newIds={newIds} />;
      break;
    default:
      assertNever(part);
  }

  return <div ref={ref}>{content}</div>;
});
