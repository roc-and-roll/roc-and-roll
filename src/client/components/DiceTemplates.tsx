import clsx from "clsx";
import React, { useEffect, useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import tinycolor from "tinycolor2";
import {
  diceTemplateAdd,
  diceTemplateRemove,
  diceTemplateUpdate,
  logEntryDiceRollAdd,
} from "../../shared/actions";
import {
  byId,
  colorForDamageType,
  damageTypes,
  entries,
  linkedModifierNames,
  multipleRollValues,
  RRCharacter,
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
import useLocalState from "../useLocalState";
import { Popover } from "./Popover";
import { Button } from "./ui/Button";
import { Select } from "./ui/Select";

type SelectionPair = { id: RRDiceTemplateID; modified: RRMultipleRoll };

export function DiceTemplates({ open }: { open: boolean }) {
  const [pickerShown, setPickerShown] = useState(false);
  const myself = useMyself();

  const allTemplates = entries(
    useServerState((state) => state.diceTemplates)
  ).filter((t) => t.playerId === myself.id);
  const hasNested = (
    template: RRDiceTemplate,
    find: RRDiceTemplateID
  ): boolean =>
    template.parts.some(
      (p) =>
        p.type === "template" &&
        (p.templateId === find ||
          hasNested(allTemplates.find((t) => t.id === p.templateId)!, find))
    );

  const templates = allTemplates.filter(
    (templateCandidate) =>
      !allTemplates.some((t) => hasNested(t, templateCandidate.id))
  );

  const dispatch = useServerDispatch();
  const newIds = useRef<RRDiceTemplateID[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<SelectionPair[]>(
    []
  );

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
      canDrop: (_item, monitor) => monitor.isOver({ shallow: true }),
    }),
    [dispatch, myself.id]
  );

  function evaluateDiceTemplatePart(
    part: RRDiceTemplatePart,
    modified: RRMultipleRoll
  ): Array<RRDice | RRModifier> {
    switch (part.type) {
      case "dice":
        return [
          roll({
            ...part,
            // click on none, is advantage --> none
            // click on disadvatage, is none --> disadvantage
            // click on none, is none --> none
            modified: part.faces !== 20 ? "none" : modified,
          }),
        ];
      case "linkedModifier":
        return [
          {
            type: "modifier",
            modifier: selectedCharacter?.attributes[part.name] ?? 0,
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
      case "template": {
        return (
          templates
            .find((t) => t.id === part.templateId)
            ?.parts.flatMap((part) =>
              evaluateDiceTemplatePart(part, modified)
            ) ?? []
        );
      }
      default:
        assertNever(part);
    }
  }

  const doRoll = () => {
    const parts = selectedTemplates.flatMap(({ id, modified }) =>
      allTemplates
        .find((t) => t.id === id)!
        .parts.flatMap((p) => evaluateDiceTemplatePart(p, modified))
    );
    if (parts.length < 1) return;

    dispatch(
      logEntryDiceRollAdd({
        silent: false,
        playerId: myself.id,
        payload: {
          rollType: "attack", // TODO
          dice: parts,
        },
      })
    );
  };

  const clickedTemplates = (
    templates: RRDiceTemplate[],
    event: React.MouseEvent,
    modified: RRMultipleRoll
  ) => {
    setSelectedTemplates((current): SelectionPair[] => {
      const currentIds = current.map(({ id }) => id);
      const countForTemplate = (tid: RRDiceTemplateID) =>
        selectedTemplates.filter(({ id }) => tid === id).length;

      const clicked = templates[templates.length - 1]!;

      if (event.ctrlKey) {
        // add parents if my count is bigger than their count
        const myCount = countForTemplate(clicked.id) + 1;
        const parents = templates.slice(0, templates.length - 1);
        const parentsToAdd = parents.flatMap<SelectionPair>((p) =>
          countForTemplate(p.id) >= myCount ? [] : { id: p.id, modified }
        );
        return [...current, ...parentsToAdd, { id: clicked.id, modified }];
      }
      if (event.shiftKey) {
        return [...current, { id: clicked.id, modified }];
      }

      return currentIds.includes(clicked.id)
        ? current.filter(({ id }) => id !== clicked.id)
        : [
            ...current,
            ...templates.flatMap<SelectionPair>((t) =>
              currentIds.includes(t.id) ? [] : { id: t.id, modified }
            ),
          ];
    });
  };

  const characters = entries(
    useServerState((state) => state.characters)
  ).filter((c) => myself.characterIds.includes(c.id));
  const [selectedCharacterId, setSelectedCharacterId, _] = useLocalState(
    "dice-templates-selected-character-id",
    characters[0]?.id ?? null
  );
  const selectedCharacter =
    characters.find((c) => c.id === selectedCharacterId) ?? null;

  return (
    <div
      className={clsx("dice-templates", { opened: open })}
      ref={dropRef}
      onClick={() => {
        doRoll();
        setSelectedTemplates([]);
      }}
    >
      {pickerShown && <DicePicker />}
      <div className="dice-templates-container">
        <button onClick={() => setPickerShown((b) => !b)}>
          Show
          <br />
          Dice
          <br />
          Picker
        </button>
        {templates.map((t) => (
          <DiceTemplatePartMenuWrapper
            key={t.id}
            template={t}
            part={{ type: "template", templateId: t.id }}
          >
            <DiceTemplate
              onRoll={(templates, modified, event) =>
                clickedTemplates(templates, event, modified)
              }
              newIds={newIds}
              templateId={t.id}
              selectedCharacter={selectedCharacter}
              selectedTemplateIds={selectedTemplates}
            />
          </DiceTemplatePartMenuWrapper>
        ))}
        <Select
          value={selectedCharacterId ?? ""}
          options={[
            { label: "", value: "" },
            ...characters.map((c) => ({ label: c.name, value: c.id })),
          ]}
          onChange={(v) => {
            setSelectedCharacterId(v === "" ? null : v);
          }}
        ></Select>
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
      <hr className="solid"></hr>
      {Array(18)
        .fill(0)
        .map(
          (_, i) =>
            i - 5 !== 0 && (
              <PickerDiceTemplatePart
                key={i}
                part={{
                  type: "modifier",
                  damage: { type: null, modifiers: [] },
                  number: i - 5,
                }}
              />
            )
        )}
      <hr className="solid"></hr>
      <PickerDiceTemplateNested />
      <hr className="solid"></hr>
      {linkedModifierNames.map((name) => (
        <PickerDiceTemplatePart
          key={name}
          part={{
            type: "linkedModifier",
            damage: { type: null, modifiers: [] },
            name,
          }}
        />
      ))}
    </div>
  );
}

function PickerDiceTemplateNested() {
  const [, dragRef] = useDrag<Record<string, never>, void, null>(() => ({
    type: "diceTemplateNested",
    item: {},
  }));

  return (
    <div className="dice-option nested-template" ref={dragRef}>
      Nested Template
    </div>
  );
}

function PickerDiceTemplatePart({ part }: { part: RRDiceTemplatePart }) {
  const [, dragRef] = useDrag<RRDiceTemplatePart, void, null>(() => ({
    type: "diceTemplatePart",
    item: part,
  }));

  const newIds = useRef([]);

  return (
    <DiceTemplatePart
      onRoll={() => {}}
      selectedTemplateIds={[]}
      ref={dragRef}
      selectedCharacter={null}
      newIds={newIds}
      part={part}
    />
  );
}

const DiceTemplate = React.memo(function DiceTemplate({
  templateId,
  newIds,
  onRoll,
  selectedCharacter,
  selectedTemplateIds,
}: {
  templateId: RRDiceTemplateID;
  newIds: React.MutableRefObject<RRDiceTemplateID[]>;
  selectedCharacter: RRCharacter | null;
  onRoll: (
    template: RRDiceTemplate[],
    modified: RRMultipleRoll,
    event: React.MouseEvent
  ) => void;
  selectedTemplateIds: SelectionPair[];
}) {
  const template = useServerState((state) =>
    byId(state.diceTemplates.entities, templateId)
  );

  if (!template) {
    return null;
  }

  return (
    <DiceTemplateInner
      onRoll={onRoll}
      template={template}
      newIds={newIds}
      selectedTemplateIds={selectedTemplateIds}
      selectedCharacter={selectedCharacter}
    />
  );
});

function DiceTemplateInner({
  template,
  newIds,
  onRoll,
  selectedTemplateIds,
  selectedCharacter,
}: {
  template: RRDiceTemplate;
  newIds: React.MutableRefObject<RRDiceTemplateID[]>;
  selectedCharacter: RRCharacter | null;
  onRoll: (
    templates: RRDiceTemplate[],
    modified: RRMultipleRoll,
    event: React.MouseEvent
  ) => void;
  selectedTemplateIds: SelectionPair[];
}) {
  const myself = useMyself();
  const dispatch = useServerDispatch();

  const [name, setName] = useOptimisticDebouncedServerUpdate(
    template.name,
    (name) => diceTemplateUpdate({ id: template.id, changes: { name } }),
    1000
  );

  const nameInputRef = useRef<HTMLInputElement>(null);

  const [, dropRef] = useDrop<RRDiceTemplatePart, void, never>(
    () => ({
      accept: ["diceTemplatePart", "diceTemplateNested"],
      drop: (item, monitor) => {
        if (monitor.getItemType() === "diceTemplateNested") {
          item = {
            type: "template",
            templateId: dispatch(
              diceTemplateAdd({
                playerId: myself.id,
                name: "",
                notes: "",
                parts: [],
                rollType: "attack",
                id: rrid<RRDiceTemplate>(),
              })
            ).payload.id,
          };
        }

        dispatch(
          diceTemplateUpdate({
            id: template.id,
            changes: {
              parts: [...template.parts, item],
            },
          })
        );
      },
      canDrop: (_item, monitor) => monitor.isOver({ shallow: true }),
    }),
    [dispatch, myself.id, template.id, template.parts]
  );

  useEffect(() => {
    if (newIds.current.includes(template.id)) {
      nameInputRef.current?.focus();
      newIds.current = newIds.current.filter((id) => id !== template.id);
    }
  }, [newIds, template]);

  const canMultipleRoll = template.parts.some(
    (d) => d.type === "dice" && d.faces === 20
  );

  const anyHasAdvantage = template.parts.some(
    (d) => d.type === "dice" && d.faces === 20 && d.modified === "advantage"
  );
  const anyHasDisadvantage = template.parts.some(
    (d) => d.type === "dice" && d.faces === 20 && d.modified === "disadvantage"
  );
  const defaultModified: RRMultipleRoll = anyHasAdvantage
    ? "advantage"
    : anyHasDisadvantage
    ? "disadvantage"
    : "none";

  const selectionCount = selectedTemplateIds.filter(
    ({ id }) => template.id === id
  ).length;

  return (
    <div
      ref={dropRef}
      onClick={(e) => {
        e.stopPropagation();
        onRoll([template], defaultModified, e);
      }}
      className={clsx("dice-template", {
        created: template,
        selected: selectionCount > 0,
      })}
    >
      {selectionCount > 1 && (
        <div className="dice-template-selection-count">{selectionCount}</div>
      )}
      <input
        ref={nameInputRef}
        value={name}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setName(e.target.value)}
      />
      {template.parts.map((part, i) => (
        <DiceTemplatePartMenuWrapper template={template} key={i} part={part}>
          <DiceTemplatePart
            selectedCharacter={selectedCharacter}
            selectedTemplateIds={selectedTemplateIds}
            onRoll={(templates, modified, event) =>
              onRoll([template, ...templates], modified, event)
            }
            part={part}
            newIds={newIds}
          />
        </DiceTemplatePartMenuWrapper>
      ))}
      {canMultipleRoll && (
        <>
          {defaultModified !== "advantage" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRoll([template], "advantage", e);
              }}
            >
              ADV
            </button>
          )}
          {defaultModified !== "none" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRoll([template], "none", e);
              }}
            >
              REG
            </button>
          )}
          {defaultModified !== "disadvantage" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRoll([template], "disadvantage", e);
              }}
            >
              DIS
            </button>
          )}
        </>
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
      <Select
        value={damageType ?? ""}
        onChange={(damageType) =>
          setDamageType(damageType === "" ? null : damageType)
        }
        options={damageTypes.map((t) => ({ value: t ?? "", label: t ?? "" }))}
      />
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
      <Select
        value={multiple}
        onChange={setMultiple}
        options={multipleRollValues.map((t) => ({
          value: t,
          label: t,
        }))}
      />
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

function TemplateNoteEditor({ templateId }: { templateId: RRDiceTemplateID }) {
  const template = useServerState((state) =>
    byId(state.diceTemplates.entities, templateId)
  )!;
  const [notes, setNotes] = useOptimisticDebouncedServerUpdate<string>(
    template.notes,
    (notes) => diceTemplateUpdate({ id: templateId, changes: { notes } }),
    1000
  );

  return (
    <div>
      Notes:
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="dice-template-notes"
      />
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

  const applyDelete = (part: RRDiceTemplatePart) => {
    dispatch(
      [
        diceTemplateUpdate({
          changes: {
            parts: template.parts.filter((p) => p !== part),
          },
          id: template.id,
        }),
        part.type === "template" && diceTemplateRemove(part.templateId),
      ].flatMap((a) => (a ? a : []))
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
          {part.type === "template" && (
            <TemplateNoteEditor templateId={part.templateId} />
          )}
          {<Button onClick={() => applyDelete(part)}> Delete </Button>}
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
          setMenuVisible((visible) => !visible);
        }}
        onClick={(e) => e.button === 2 && e.stopPropagation()}
        className="dice-template-outer"
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
    onRoll: (
      templates: RRDiceTemplate[],
      modified: RRMultipleRoll,
      event: React.MouseEvent
    ) => void;
    selectedTemplateIds: SelectionPair[];
    selectedCharacter: RRCharacter | null;
  }
>(function DiceTemplatePart(
  { part, newIds, onRoll, selectedTemplateIds, selectedCharacter },
  ref
) {
  let content: JSX.Element;

  const styleFor = (part: RRDiceTemplatePartWithDamage) => ({
    background: colorForDamageType(part.damage.type),
    color: tinycolor
      .mostReadable(tinycolor(colorForDamageType(part.damage.type)), [
        "#000",
        "#fff",
      ])
      .toHexString(),
  });

  switch (part.type) {
    case "modifier":
      content = (
        <div className="dice-option" style={styleFor(part)}>
          {part.number >= 0 && "+"}
          {part.number}
        </div>
      );
      break;
    case "linkedModifier":
      content = (
        <div className="dice-option" style={styleFor(part)}>
          <div className="dice-option-linked-modifier">
            {selectedCharacter?.attributes[part.name] ?? null}
          </div>
          <div className="dice-option-linked-modifier-name">
            {part.name[0]!.toUpperCase() + part.name.substring(1, 4)}
          </div>
        </div>
      );
      break;
    case "dice":
      content = (
        <div className="dice-option" style={styleFor(part)}>
          {part.count}d{part.faces}
        </div>
      );
      break;
    case "template":
      content = (
        <DiceTemplate
          onRoll={(templates, modified, event) =>
            onRoll(templates, modified, event)
          }
          selectedCharacter={null}
          templateId={part.templateId}
          newIds={newIds}
          selectedTemplateIds={selectedTemplateIds}
        />
      );
      break;
    default:
      assertNever(part);
  }

  return <div ref={ref}>{content}</div>;
});
