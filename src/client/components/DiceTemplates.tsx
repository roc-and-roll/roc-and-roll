import {
  faEdit,
  faMinusCircle,
  faPlusCircle,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import React, { useEffect, useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import ReactDOM from "react-dom";
import {
  logEntryDiceRollAdd,
  playerAddDiceTemplate,
  playerRemoveDiceTemplate,
  playerUpdateDiceTemplate,
} from "../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../shared/constants";
import {
  colorForDamageType,
  damageTypes,
  multipleRollValues,
  RRDiceTemplateID,
  RRDiceTemplatePart,
  RRDiceTemplatePartDice,
  RRDiceTemplatePartModifier,
  RRDiceTemplatePartWithDamage,
  RRMultipleRoll,
  characterStatNames,
  iconMap,
  RRDiceTemplatePartLinkedProficiency,
  RRDiceTemplatePartLinkedModifier,
  proficiencyValues,
  RRDiceTemplatePartTemplate,
  RRDiceTemplateCategoryID,
  RRDiceTemplatePartID,
  RRPlayerID,
  RRCharacter,
} from "../../shared/state";
import { assertNever, empty2Null, rrid } from "../../shared/util";
import {
  RRDiceTemplate,
  RRDiceTemplateCategory,
} from "../../shared/validation";
import { useMyProps } from "../myself";
import { useRRSettings } from "../settings";
import { useServerDispatch, useServerState } from "../state";
import {
  contrastColor,
  getProficiencyValueString,
  modifierFromStat,
} from "../util";
import { Popover } from "./Popover";
import { Button } from "./ui/Button";
import { Select } from "./ui/Select";
import {
  SmartIntegerInput,
  SmartTextareaInput,
  SmartTextInput,
} from "./ui/TextInput";
import { evaluateDiceTemplatePart, getModifierForTemplate } from "../diceUtils";

type SelectionPair = { id: RRDiceTemplateID; modified: RRMultipleRoll };

export const DiceTemplates = React.memo(function DiceTemplates({
  category,
}: {
  category: RRDiceTemplateCategory;
}) {
  const [templatesEditable, setTemplatesEditable] = useState(false);
  const myself = useMyProps(
    "id",
    "characterIds",
    "diceTemplateCategories",
    "mainCharacterId"
  );

  const dispatch = useServerDispatch();
  const newIds = useRef<RRDiceTemplateID[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<SelectionPair[]>(
    []
  );

  const character: RRCharacter | null = useServerState((state) =>
    myself.mainCharacterId
      ? state.characters.entities[myself.mainCharacterId] ?? null
      : null
  );

  const [, dropRef] = useDrop<
    RRDiceTemplatePart | RRDiceTemplatePart[],
    void,
    never
  >(
    () => ({
      accept: ["diceTemplatePart", "diceTemplate"],
      drop: (item, monitor) => {
        if (Array.isArray(item)) {
          item = item.map((part) => {
            return { ...part, id: rrid<RRDiceTemplatePart>() };
          });
        }
        const action = playerAddDiceTemplate({
          categoryId: category.id,
          id: myself.id,
          template: {
            id: rrid<RRDiceTemplate>(),
            name: "",
            notes: "",
            rollType: "attack",
            parts: Array.isArray(item) ? item : [item],
          },
        });
        newIds.current.push(action.payload.template.id);
        dispatch(action);
      },
      canDrop: (_item, monitor) => monitor.isOver({ shallow: true }),
    }),
    [category, dispatch, myself.id]
  );

  const doRoll = (crit: boolean = false) => {
    const parts = selectedTemplates.flatMap(
      ({ id, modified }) =>
        category.templates
          .find((t) => t.id === id)
          ?.parts.flatMap((p) =>
            evaluateDiceTemplatePart(p, modified, crit, character)
          ) ?? []
    );
    if (parts.length < 1) return;

    const rollTemplates = selectedTemplates.flatMap(
      ({ id }) => category.templates.find((t) => t.id === id) ?? []
    );
    const rollName = empty2Null(
      rollTemplates
        .map((template) => template.name)
        .join(" ")
        .trim()
    );

    dispatch(
      logEntryDiceRollAdd({
        silent: false,
        playerId: myself.id,
        payload: {
          rollType: "attack", // TODO
          rollName,
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

  return (
    <div
      className={clsx("dice-templates")}
      onContextMenu={(e) => {
        e.preventDefault();
        doRoll();
        setSelectedTemplates([]);
      }}
      onClick={() => {
        setSelectedTemplates([]);
      }}
    >
      {selectedTemplates.length > 0 &&
        ReactDOM.createPortal(
          <div className="dice-template-roll-hints">
            <Button
              onClick={() => {
                doRoll();
                setSelectedTemplates([]);
              }}
            >
              Roll the Dice!
            </Button>
            <Button
              onClick={() => {
                doRoll(true);
                setSelectedTemplates([]);
              }}
            >
              Roll a Crit!
            </Button>
            <em>Or right-click the pane to roll</em>
          </div>,
          document.body
        )}
      <div style={{ width: "100%" }}>
        <div style={{ display: "flex" }}>
          <Button
            style={{ width: "28px" }}
            onClick={() => setTemplatesEditable((b) => !b)}
          >
            <FontAwesomeIcon icon={faEdit} />
          </Button>
        </div>
        {templatesEditable && <DicePicker />}

        <div className="dice-templates-container" ref={dropRef}>
          {category.templates.map((template) => (
            <DiceTemplatePartMenuWrapper
              categoryId={category.id}
              key={template.id}
              template={template}
              part={{
                id: rrid<RRDiceTemplatePart>(),
                type: "template",
                template,
              }}
            >
              <DiceTemplate
                categoryId={category.id}
                onRoll={(templates, modified, event) =>
                  clickedTemplates(templates, event, modified)
                }
                newIds={newIds}
                template={template}
                selectedTemplateIds={selectedTemplates}
                editable={templatesEditable}
                isChildTemplate={false}
              />
            </DiceTemplatePartMenuWrapper>
          ))}
        </div>
      </div>
    </div>
  );
});

export const GeneratedDiceTemplates = React.memo(
  function GeneratedDiceTemplates({
    templates,
  }: {
    templates: RRDiceTemplate[];
  }) {
    return (
      <div className="generated-dice-templates-container">
        {templates.map((template) => {
          return (
            <GeneratedDiceTemplate key={template.id} template={template} />
          );
        })}
      </div>
    );
  }
);

function GeneratedDiceTemplate({ template }: { template: RRDiceTemplate }) {
  const myself = useMyProps("id", "mainCharacterId");
  const dispatch = useServerDispatch();
  const [isHovered, setIsHovered] = useState(false);
  const character: RRCharacter | null = useServerState((state) =>
    myself.mainCharacterId
      ? state.characters.entities[myself.mainCharacterId] ?? null
      : null
  );

  const doRoll = (template: RRDiceTemplate, modified: RRMultipleRoll) => {
    const parts = template.parts.flatMap((p) =>
      evaluateDiceTemplatePart(p, modified, false, character)
    );
    if (parts.length < 1) return;

    dispatch(
      logEntryDiceRollAdd({
        silent: false,
        playerId: myself.id,
        payload: {
          rollType: "attack", // TODO
          rollName: template.name,
          dice: parts,
        },
      })
    );
  };
  function handleMoueLeave() {
    setIsHovered(false);
  }
  function handleMouseEnter() {
    setIsHovered(true);
  }

  let modifierString = "";
  if (getModifierForTemplate(template, character) > 0) modifierString += "+";
  modifierString += getModifierForTemplate(template, character);

  return (
    <div
      onClick={() => doRoll(template, "none")}
      title="Click to Roll"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMoueLeave}
      className={clsx("generated-dice-templates", isHovered ? "hovered" : "")}
    >
      <p className="template-name">{template.name}</p>
      <p className="modifier-value">{modifierString}</p>
      {isHovered && (
        <div
          className="modifier-button disadvantage"
          onClick={(event) => {
            event.stopPropagation();
            doRoll(template, "disadvantage");
          }}
        >
          <FontAwesomeIcon icon={faMinusCircle} />
        </div>
      )}
      {isHovered && (
        <div
          className="modifier-button advantage"
          onClick={(event) => {
            event.stopPropagation();
            doRoll(template, "advantage");
          }}
        >
          <FontAwesomeIcon icon={faPlusCircle} />
        </div>
      )}
    </div>
  );
}

function DicePicker() {
  const makeDicePart = (faces: number) =>
    ({
      id: rrid<RRDiceTemplatePart>(),
      damage: { type: null },
      type: "dice",
      faces,
      count: 1,
      negated: false,
      modified: "none",
    } as const);
  const [diceHolder, setDiceHolder] = useState<RRDiceTemplatePart[]>([]);
  const diceParts = [4, 6, 8, 10, 12, 20].map((faces) => makeDicePart(faces));

  function generateProficiencyPart(): RRDiceTemplatePartLinkedProficiency {
    return {
      id: rrid<RRDiceTemplatePart>(),
      type: "linkedProficiency" as const,
      damage: { type: null },
      proficiency: 1,
    };
  }
  const proficiencyPart = generateProficiencyPart();

  function generateInitiativePart(): RRDiceTemplatePartLinkedModifier {
    return {
      id: rrid<RRDiceTemplatePart>(),
      type: "linkedModifier" as const,
      damage: { type: null },
      name: "initiative",
    };
  }
  const initiativePart = generateInitiativePart();

  return (
    <div className="dice-picker">
      {diceParts.map((part) => {
        return (
          <PickerDiceTemplatePart
            part={part}
            key={part.id}
            onClick={() => setDiceHolder([...diceHolder, part])}
          />
        );
      })}
      <hr className="solid"></hr>
      {Array(18)
        .fill(0)
        .map((_, i) => {
          const part = {
            id: rrid<RRDiceTemplatePart>(),
            type: "modifier" as const,
            damage: { type: null },
            number: i - 5,
          };
          return (
            i - 5 !== 0 && (
              <PickerDiceTemplatePart
                key={i}
                part={part}
                onClick={() => setDiceHolder([...diceHolder, part])}
              />
            )
          );
        })}
      <hr className="solid"></hr>
      <PickerDiceTemplateNested />
      <hr className="solid"></hr>
      <PickerDiceTemplatePart
        part={initiativePart}
        onClick={() => setDiceHolder([...diceHolder, initiativePart])}
      />
      <PickerDiceTemplatePart
        part={proficiencyPart}
        onClick={() => setDiceHolder([...diceHolder, proficiencyPart])}
      />
      {characterStatNames.map((name) => {
        const part = {
          id: rrid<RRDiceTemplatePart>(),
          type: "linkedStat" as const,
          damage: { type: null },
          name,
        };
        return (
          <PickerDiceTemplatePart
            key={name}
            part={part}
            onClick={() => setDiceHolder([...diceHolder, part])}
          />
        );
      })}
      <hr className="solid"></hr>
      <DiceHolder diceTemplateParts={diceHolder} />
      <Button onClick={() => setDiceHolder([])}>EMPTY</Button>
    </div>
  );
}

function DiceHolder({
  diceTemplateParts,
}: {
  diceTemplateParts: RRDiceTemplatePart[];
}) {
  const [, dragRef] = useDrag<RRDiceTemplatePart[], void, null>(
    () => ({
      type: "diceTemplate",
      item: diceTemplateParts,
      options: { dropEffect: "copy" },
    }),
    [diceTemplateParts]
  );

  return (
    <div className="dice-holder" ref={dragRef}>
      {diceTemplateParts.map((part) => {
        return (
          <PickerDiceTemplatePart // TODO: make them not draggable
            part={part}
            key={part.id}
            onClick={() => {}}
          />
        );
      })}
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

function PickerDiceTemplatePart({
  part,
  onClick,
}: {
  part: RRDiceTemplatePart;
  onClick: () => void;
}) {
  const [, dragRef] = useDrag<RRDiceTemplatePart, void, null>(() => ({
    type: "diceTemplatePart",
    item: part,
  }));

  const newIds = useRef([]);

  return (
    <DiceTemplatePart
      categoryId={"" as RRDiceTemplateCategoryID}
      onRoll={() => {}}
      selectedTemplateIds={[]}
      ref={dragRef}
      onClick={onClick}
      newIds={newIds}
      part={part}
      editable={false}
    />
  );
}

const DiceTemplate = React.memo(function DiceTemplate({
  template,
  categoryId,
  newIds,
  onRoll,
  selectedTemplateIds,
  editable,
  isChildTemplate,
}: {
  template: RRDiceTemplate;
  categoryId: RRDiceTemplateCategoryID;
  newIds: React.MutableRefObject<RRDiceTemplateID[]>;
  onRoll: (
    templates: RRDiceTemplate[],
    modified: RRMultipleRoll,
    event: React.MouseEvent
  ) => void;
  selectedTemplateIds: SelectionPair[];
  editable: boolean;
  isChildTemplate: boolean;
}) {
  const myself = useMyProps("id");
  const dispatch = useServerDispatch();

  const nameInputRef = useRef<HTMLInputElement>(null);

  const [{ collapseDiceTemplates }] = useRRSettings();
  const [myExpanded, setExpanded] = useState(false);
  const expanded =
    isChildTemplate || !collapseDiceTemplates || myExpanded || editable;

  const [, dropRef] = useDrop<
    RRDiceTemplatePart | RRDiceTemplatePart[],
    void,
    never
  >(
    () => ({
      accept: ["diceTemplatePart", "diceTemplateNested", "diceTemplate"],
      drop: (item, monitor) => {
        switch (monitor.getItemType()) {
          case "diceTemplateNested": {
            item = {
              ...(item as RRDiceTemplatePartTemplate),
              id: rrid<RRDiceTemplatePart>(),
              template: {
                id: rrid<RRDiceTemplate>(),
                name: "",
                notes: "",
                parts: [],
                rollType: "attack",
              },
            };
            break;
          }
          case "diceTemplatePart":
            item = {
              ...item,
              id: rrid<RRDiceTemplatePart>(),
            };
            break;
          case "diceTemplate":
            item = (item as RRDiceTemplatePart[]).map((part) => {
              return { ...part, id: rrid<RRDiceTemplatePart>() };
            });
            break;
          default:
            throw new Error("Unsupported Drop Type!");
        }

        dispatch(
          playerUpdateDiceTemplate({
            id: myself.id,
            categoryId,
            template: {
              id: template.id,
              changes: {
                parts: Array.isArray(item)
                  ? [...template.parts, ...item] // TODO: Create new nested Template?
                  : [...template.parts, item],
              },
            },
          })
        );
      },
      canDrop: (_item, monitor) => monitor.isOver({ shallow: true }),
    }),
    [categoryId, dispatch, myself.id, template.id, template.parts]
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

  function sortTemplateParts(a: RRDiceTemplatePart, b: RRDiceTemplatePart) {
    let damageTypeResult = 0;
    //sort by damage type
    if (a.type !== "template" && b.type !== "template") {
      damageTypeResult = (a.damage.type ?? "zzzz").localeCompare(
        b.damage.type ?? "zzzz"
      );
    }

    //afterwards sort by template type
    //first dice, then modifiers, then templates
    let typeResult = 0;
    if (a.type === b.type) typeResult = 0;
    else if (a.type === "template") typeResult = 1;
    else if (b.type === "template") typeResult = -1;
    else if (a.type === "dice") typeResult = -1;
    else if (b.type === "dice") typeResult = 1;
    else if (a.type === "linkedModifier" || a.type === "linkedStat")
      typeResult = -1;
    else if (b.type === "linkedModifier" || b.type === "linkedStat")
      typeResult = 1;

    //lastly sort the dice and modifiers by value
    let valueResult = 0;
    if (a.type === "template" || b.type === "template") valueResult = 0;
    else if (a.type === "dice" && b.type === "dice")
      valueResult = a.faces - b.faces;
    else if (a.type === "modifier" && b.type === "modifier")
      valueResult = a.number - b.number;

    //combine all the sorts
    return damageTypeResult || typeResult || valueResult;
  }

  return (
    <div
      ref={dropRef}
      onClick={(e) => {
        if (e.button === 0) {
          e.stopPropagation();
          onRoll([template], defaultModified, e);
        }
      }}
      onMouseEnter={(e) => setExpanded(true)}
      onMouseLeave={(e) => setExpanded(false)}
      className={clsx("dice-template", {
        created: template,
        selected: selectionCount > 0,
        expanded: expanded,
      })}
    >
      {selectionCount > 1 && (
        <div className="dice-template-selection-count">{selectionCount}</div>
      )}
      {expanded && (
        <>
          {editable ? (
            <SmartTextInput
              ref={nameInputRef}
              value={template.name}
              onClick={(e) => e.stopPropagation()}
              onChange={(name) =>
                dispatch({
                  actions: [
                    playerUpdateDiceTemplate({
                      id: myself.id,
                      categoryId: categoryId,
                      template: { id: template.id, changes: { name } },
                    }),
                  ],
                  optimisticKey: "name",
                  syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
                })
              }
            />
          ) : (
            <p>{template.name}</p>
          )}
          {[...template.parts].sort(sortTemplateParts).map((part, i) => (
            <DiceTemplatePartMenuWrapper
              template={template}
              key={i}
              part={part}
              categoryId={categoryId}
            >
              <DiceTemplatePart
                categoryId={categoryId}
                selectedTemplateIds={selectedTemplateIds}
                onRoll={(templates, modified, event) =>
                  onRoll([template, ...templates], modified, event)
                }
                part={part}
                newIds={newIds}
                editable={editable}
              />
            </DiceTemplatePartMenuWrapper>
          ))}
          {canMultipleRoll && (
            <>
              {defaultModified !== "advantage" && (
                <Button
                  onClick={(e) => {
                    if (e.button === 0) {
                      e.stopPropagation();
                      onRoll([template], "advantage", e);
                    }
                  }}
                >
                  ADV
                </Button>
              )}
              {defaultModified !== "none" && (
                <Button
                  onClick={(e) => {
                    if (e.button === 0) {
                      e.stopPropagation();
                      onRoll([template], "none", e);
                    }
                  }}
                >
                  REG
                </Button>
              )}
              {defaultModified !== "disadvantage" && (
                <Button
                  onClick={(e) => {
                    if (e.button === 0) {
                      e.stopPropagation();
                      onRoll([template], "disadvantage", e);
                    }
                  }}
                >
                  DIS
                </Button>
              )}
            </>
          )}
        </>
      )}
      {!expanded && <p>{template.name}</p>}
    </div>
  );
});

function DamageTypeEditor({
  part,
  template,
  categoryId,
}: {
  part: RRDiceTemplatePartWithDamage;
  template: RRDiceTemplate;
  categoryId: RRDiceTemplateCategoryID;
}) {
  const dispatch = useServerDispatch();
  const myself = useMyProps("id");

  return (
    <label>
      Damage Type:
      <Select
        value={part.damage.type ?? ""}
        onChange={(damageType) =>
          dispatch({
            actions: [
              updatePartAction(myself.id, part.id, categoryId, template, {
                damage: { type: empty2Null(damageType) },
              }),
            ],
            optimisticKey: "damageType",
            syncToServerThrottle: 0,
          })
        }
        options={damageTypes.map((t) => ({ value: t ?? "", label: t ?? "" }))}
      />
    </label>
  );
}

const removePartAction = (
  myId: RRPlayerID,
  partId: RRDiceTemplatePartID,
  categoryId: RRDiceTemplateCategoryID,
  diceTemplate: RRDiceTemplate
) =>
  playerUpdateDiceTemplate({
    id: myId,
    categoryId,
    template: {
      id: diceTemplate.id,
      changes: {
        parts: diceTemplate.parts.filter((p) => p.id !== partId),
      },
    },
  });

const updatePartAction = (
  myId: RRPlayerID,
  partId: RRDiceTemplatePartID,
  categoryId: RRDiceTemplateCategoryID,
  diceTemplate: RRDiceTemplate,
  changes: Partial<RRDiceTemplatePart>
) =>
  playerUpdateDiceTemplate({
    id: myId,
    categoryId,
    template: {
      id: diceTemplate.id,
      changes: {
        parts: diceTemplate.parts.map((p) =>
          p.id === partId ? { ...p, changes } : p
        ),
      },
    },
  });

function DiceMultipleRollEditor({
  part,
  template,
  categoryId,
}: {
  part: RRDiceTemplatePartDice;
  template: RRDiceTemplate;
  categoryId: RRDiceTemplateCategoryID;
}) {
  const dispatch = useServerDispatch();
  const myself = useMyProps("id");

  return (
    <label>
      Multiple:
      <Select
        value={part.modified}
        onChange={(modified) =>
          dispatch({
            actions: [
              updatePartAction(myself.id, part.id, categoryId, template, {
                modified,
              }),
            ],
            optimisticKey: "modified",
            syncToServerThrottle: 0,
          })
        }
        options={multipleRollValues.map((t) => ({
          value: t,
          label: t,
        }))}
      />
    </label>
  );
}

function DiceCountEditor({
  part,
  template,
  categoryId,
}: {
  part: RRDiceTemplatePartDice;
  template: RRDiceTemplate;
  categoryId: RRDiceTemplateCategoryID;
}) {
  const dispatch = useServerDispatch();
  const myself = useMyProps("id");

  return (
    <label>
      Count:
      <SmartIntegerInput
        value={part.count}
        onChange={(count) =>
          dispatch({
            actions: [
              updatePartAction(myself.id, part.id, categoryId, template, {
                count,
              }),
            ],
            optimisticKey: "count",
            syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
          })
        }
      />
    </label>
  );
}

function ModifierNumberEditor({
  part,
  template,
  categoryId,
}: {
  part: RRDiceTemplatePartModifier;
  template: RRDiceTemplate;
  categoryId: RRDiceTemplateCategoryID;
}) {
  const dispatch = useServerDispatch();
  const myself = useMyProps("id");

  return (
    <label>
      Modifier:
      <SmartIntegerInput
        value={part.number}
        onChange={(number) =>
          dispatch({
            actions: [
              updatePartAction(myself.id, part.id, categoryId, template, {
                number,
              }),
            ],
            optimisticKey: "number",
            syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
          })
        }
      />
    </label>
  );
}

function ProficiencyValueEditor({
  part,
  template,
  categoryId,
}: {
  part: RRDiceTemplatePartLinkedProficiency;
  template: RRDiceTemplate;
  categoryId: RRDiceTemplateCategoryID;
}) {
  const dispatch = useServerDispatch();
  const myself = useMyProps("id");

  return (
    <label>
      Proficiency:
      <Select
        options={proficiencyValues.map((t) => ({
          value: t.toString(),
          label: getProficiencyValueString(t),
        }))}
        value={part.proficiency.toString()}
        onChange={(newValue: string) =>
          dispatch({
            actions: [
              updatePartAction(myself.id, part.id, categoryId, template, {
                proficiency: parseFloat(
                  newValue
                ) as typeof proficiencyValues[number],
              }),
            ],
            optimisticKey: "proficiency",
            syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
          })
        }
      />
    </label>
  );
}

function TemplateSettingsEditor({
  categoryId,
  template,
}: {
  categoryId: RRDiceTemplateCategoryID;
  template: RRDiceTemplate;
}) {
  const dispatch = useServerDispatch();
  const myself = useMyProps("diceTemplateCategories", "id");

  return (
    <div>
      <label>
        Category:
        {myself.diceTemplateCategories.map((category) => (
          <label
            key={category.id}
            className="radio-label"
            title={category.categoryName}
          >
            <input
              type="radio"
              name="icon"
              value={category.id}
              //TODO how was this working?
              checked={categoryId === category.id}
              onChange={(e) =>
                dispatch({
                  actions: [
                    //TODO does this work?
                    playerRemoveDiceTemplate({
                      id: myself.id,
                      categoryId: category.id,
                      templateId: template.id,
                    }),
                    playerAddDiceTemplate({
                      id: myself.id,
                      categoryId: category.id,
                      template: template,
                    }),
                  ],
                  optimisticKey: "diceTemplate",
                  syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
                })
              }
            />
            <FontAwesomeIcon icon={iconMap[category.icon]} fixedWidth />
          </label>
        ))}
      </label>
      <label>
        Notes:
        <SmartTextareaInput
          value={template.notes}
          onChange={(notes) =>
            dispatch({
              actions: [
                playerUpdateDiceTemplate({
                  id: myself.id,
                  categoryId,
                  template: {
                    id: template.id,
                    changes: {
                      notes,
                    },
                  },
                }),
              ],
              optimisticKey: "notes",
              syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
            })
          }
          className="dice-template-notes"
        />
      </label>
    </div>
  );
}

const DiceTemplatePartMenuWrapper: React.FC<{
  part: RRDiceTemplatePart;
  template: RRDiceTemplate;
  categoryId: RRDiceTemplateCategoryID;
}> = ({ part, template, children, categoryId }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const dispatch = useServerDispatch();
  const myself = useMyProps("id");

  const applyDelete = (part: RRDiceTemplatePart) => {
    dispatch(removePartAction(myself.id, part.id, categoryId, template));
  };

  return (
    <Popover
      content={
        <div onClick={(e) => e.stopPropagation()}>
          {(part.type === "dice" ||
            part.type === "linkedModifier" ||
            part.type === "linkedProficiency" ||
            part.type === "linkedStat" ||
            part.type === "modifier") && (
            <DamageTypeEditor
              part={part}
              template={template}
              categoryId={categoryId}
            />
          )}
          {part.type === "dice" && (
            <DiceCountEditor
              part={part}
              template={template}
              categoryId={categoryId}
            />
          )}
          {part.type === "dice" && (
            <DiceMultipleRollEditor
              part={part}
              template={template}
              categoryId={categoryId}
            />
          )}
          {part.type === "modifier" && (
            <ModifierNumberEditor
              part={part}
              template={template}
              categoryId={categoryId}
            />
          )}
          {part.type === "linkedProficiency" && (
            <ProficiencyValueEditor
              part={part}
              template={template}
              categoryId={categoryId}
            />
          )}
          {part.type === "template" && (
            <TemplateSettingsEditor
              categoryId={categoryId}
              template={part.template}
            />
          )}
          <Button
            className="red"
            onClick={() => {
              applyDelete(part);
              setMenuVisible(false);
            }}
          >
            delete
          </Button>
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
    categoryId: RRDiceTemplateCategoryID;
    onClick?: () => void;
    editable: boolean;
  }
>(function DiceTemplatePart(
  { part, newIds, onRoll, categoryId, selectedTemplateIds, onClick, editable },
  ref
) {
  let content: JSX.Element;

  const styleFor = (part: RRDiceTemplatePartWithDamage) => ({
    background: colorForDamageType(part.damage.type),
    color: contrastColor(colorForDamageType(part.damage.type)),
  });

  const myself = useMyProps("mainCharacterId");
  const character: RRCharacter | null = useServerState((state) =>
    myself.mainCharacterId
      ? state.characters.entities[myself.mainCharacterId] ?? null
      : null
  );

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
            {character?.attributes[part.name] ?? null}
          </div>
          <div className="dice-option-linked-modifier-name">
            {part.name[0]!.toUpperCase() + part.name.substring(1, 4)}
          </div>
        </div>
      );
      break;
    case "linkedProficiency":
      content = (
        <div className="dice-option" style={styleFor(part)}>
          <div className="dice-option-linked-modifier">
            {
              //TODO this shows incorrect value in editor, others show no value
              character?.attributes["proficiency"]
                ? character.attributes["proficiency"] * part.proficiency
                : null
            }
          </div>
          <div className="dice-option-linked-modifier-name">{"Prof"}</div>
        </div>
      );
      break;
    case "linkedStat":
      content = (
        <div className="dice-option" style={styleFor(part)}>
          <div className="dice-option-linked-modifier">
            {character?.stats[part.name]
              ? modifierFromStat(character.stats[part.name]!)
              : null}
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
          template={part.template}
          categoryId={categoryId}
          newIds={newIds}
          selectedTemplateIds={selectedTemplateIds}
          editable={editable}
          isChildTemplate={true}
        />
      );
      break;
    default:
      assertNever(part);
  }

  return (
    <div ref={ref} onClick={onClick}>
      {content}
    </div>
  );
});
