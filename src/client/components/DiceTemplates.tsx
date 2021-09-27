import { faEdit } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import React, { useEffect, useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import ReactDOM from "react-dom";
import {
  diceTemplateAdd,
  diceTemplatePartRemove,
  diceTemplatePartUpdate,
  diceTemplateRemove,
  diceTemplateUpdate,
  logEntryDiceRollAdd,
} from "../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../shared/constants";
import {
  colorForDamageType,
  damageTypes,
  entries,
  characterAttributeNames,
  multipleRollValues,
  RRCharacter,
  RRDice,
  RRDiceTemplate,
  RRDiceTemplateID,
  RRDiceTemplatePart,
  RRDiceTemplatePartDice,
  RRDiceTemplatePartModifier,
  RRDiceTemplatePartWithDamage,
  RRModifier,
  RRMultipleRoll,
  SyncedStateAction,
} from "../../shared/state";
import { assertNever, empty2Null, rrid } from "../../shared/util";
import { useMyself } from "../myself";
import { roll } from "../roll";
import { useRRSettings } from "../settings";
import { useServerDispatch, useServerState, useServerStateRef } from "../state";
import useLocalState from "../useLocalState";
import { contrastColor } from "../util";
import { diceCategories } from "./DicePanel";
import { Popover } from "./Popover";
import { Button } from "./ui/Button";
import { Select } from "./ui/Select";
import {
  SmartIntegerInput,
  SmartTextareaInput,
  SmartTextInput,
} from "./ui/TextInput";

type SelectionPair = { id: RRDiceTemplateID; modified: RRMultipleRoll };

export const DiceTemplates = React.memo(function DiceTemplates({
  categoryIndex,
}: {
  categoryIndex: number;
}) {
  const [templatesEditable, setTemplatesEditable] = useState(false);
  const myself = useMyself();

  const allTemplates = entries(
    useServerState((state) => state.diceTemplates)
  ).filter((t) => t.playerId === myself.id);

  const isNestedTemplateOf = (
    topTemplate: RRDiceTemplate | undefined,
    childTemplateId: RRDiceTemplateID
  ): boolean =>
    topTemplate?.parts.some(
      (p) =>
        p.type === "template" &&
        (p.templateId === childTemplateId ||
          isNestedTemplateOf(
            allTemplates.find((t) => t.id === p.templateId),
            childTemplateId
          ))
    ) ?? false;

  const allTemplatesInCategory = allTemplates.filter(
    (t) => t.categoryIndex === categoryIndex
  );

  // Get all top-level templates in this category (= all templates that are not
  // nested as part of another template)
  const allTopLevelTemplatesInCategory = allTemplatesInCategory.filter(
    (templateCandidate) =>
      !allTemplatesInCategory.some((t) =>
        isNestedTemplateOf(t, templateCandidate.id)
      )
  );

  const dispatch = useServerDispatch();
  const newIds = useRef<RRDiceTemplateID[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<SelectionPair[]>(
    []
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
        const id = rrid<RRDiceTemplate>();
        newIds.current.push(id);
        dispatch(
          diceTemplateAdd({
            id,
            categoryIndex,
            playerId: myself.id,
            name: "",
            notes: "",
            rollType: "attack",
            parts: Array.isArray(item) ? item : [item],
          })
        );
      },
      canDrop: (_item, monitor) => monitor.isOver({ shallow: true }),
    }),
    [categoryIndex, dispatch, myself.id]
  );

  function evaluateDiceTemplatePart(
    part: RRDiceTemplatePart,
    modified: RRMultipleRoll,
    crit: boolean = false
  ): Array<RRDice | RRModifier> {
    switch (part.type) {
      case "dice": {
        const res = [
          roll({
            ...part,
            // click on none, is advantage --> none
            // click on disadvatage, is none --> disadvantage
            // click on none, is none --> none
            modified: part.faces !== 20 ? "none" : modified,
          }),
        ];
        if (crit) {
          res.push(
            roll({
              ...part,
              modified: part.faces !== 20 ? "none" : modified,
            })
          );
        }
        return res;
      }
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
        // Do not evaluate nested templates, since they are evaluated separately
        // if they are selected.
        //
        // return (
        //   allTemplates
        //     .find((t) => t.id === part.templateId)
        //     ?.parts.flatMap((part) =>
        //       evaluateDiceTemplatePart(part, modified, crit)
        //     ) ?? []
        // );
        return [];
      }
      default:
        assertNever(part);
    }
  }

  const doRoll = (crit: boolean = false) => {
    const parts = selectedTemplates.flatMap(
      ({ id, modified }) =>
        allTemplates
          .find((t) => t.id === id)
          ?.parts.flatMap((p) => evaluateDiceTemplatePart(p, modified, crit)) ??
        []
    );
    if (parts.length < 1) return;

    const templates = selectedTemplates.flatMap(
      ({ id }) => allTemplates.find((t) => t.id === id) ?? []
    );
    const rollName = empty2Null(
      templates
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
      <div>
        <div style={{ display: "flex" }}>
          <Select
            value={selectedCharacterId ?? ""}
            options={[
              { label: "", value: "" },
              ...characters.map((c) => ({ label: c.name, value: c.id })),
            ]}
            onChange={(v) => {
              setSelectedCharacterId(empty2Null(v));
            }}
            style={{ margin: "0.15rem" }}
          ></Select>
          <Button
            style={{ width: "28px" }}
            onClick={() => setTemplatesEditable((b) => !b)}
          >
            <FontAwesomeIcon icon={faEdit} />
          </Button>
        </div>
        {templatesEditable && <DicePicker />}

        <div className="dice-templates-container" ref={dropRef}>
          {allTopLevelTemplatesInCategory.map((t) => (
            <DiceTemplatePartMenuWrapper
              key={t.id}
              template={t}
              part={{
                id: rrid<RRDiceTemplatePart>(),
                type: "template",
                templateId: t.id,
              }}
            >
              <DiceTemplate
                onRoll={(templates, modified, event) =>
                  clickedTemplates(templates, event, modified)
                }
                newIds={newIds}
                templateId={t.id}
                selectedCharacter={selectedCharacter}
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

function DicePicker() {
  const makeDicePart = (faces: number) =>
    ({
      id: rrid<RRDiceTemplatePart>(),
      damage: { type: null, modifiers: [] },
      type: "dice",
      faces,
      count: 1,
      negated: false,
      modified: "none",
    } as const);
  const [diceHolder, setDiceHolder] = useState<RRDiceTemplatePart[]>([]);
  const diceParts = [4, 6, 8, 10, 12, 20].map((faces) => makeDicePart(faces));

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
            damage: { type: null, modifiers: [] },
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
      {characterAttributeNames.map((name) => {
        const part = {
          id: rrid<RRDiceTemplatePart>(),
          type: "linkedModifier" as const,
          damage: { type: null, modifiers: [] },
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
      onRoll={() => {}}
      selectedTemplateIds={[]}
      ref={dragRef}
      onClick={onClick}
      selectedCharacter={null}
      newIds={newIds}
      part={part}
      editable={false}
    />
  );
}

const DiceTemplate = React.memo(function DiceTemplate({
  templateId,
  newIds,
  onRoll,
  selectedCharacter,
  selectedTemplateIds,
  editable,
  isChildTemplate,
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
  editable: boolean;
  isChildTemplate: boolean;
}) {
  const template = useServerState(
    (state) => state.diceTemplates.entities[templateId]
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
      editable={editable}
      isChildTemplate={isChildTemplate}
    />
  );
});

function DiceTemplateInner({
  template,
  newIds,
  onRoll,
  selectedTemplateIds,
  selectedCharacter,
  editable,
  isChildTemplate,
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
  editable: boolean;
  isChildTemplate: boolean;
}) {
  const myself = useMyself();
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
            const action = diceTemplateAdd({
              playerId: myself.id,
              name: "",
              categoryIndex: -1,
              notes: "",
              parts: [],
              rollType: "attack",
              id: rrid<RRDiceTemplate>(),
            });
            dispatch(action);

            item = {
              id: rrid<RRDiceTemplatePart>(),
              type: "template",
              templateId: action.payload.id,
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
          diceTemplateUpdate({
            id: template.id,
            changes: {
              parts: Array.isArray(item)
                ? [...template.parts, ...item] // TODO: Create new nested Template?
                : [...template.parts, item],
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
    else if (a.type === "linkedModifier") typeResult = -1;
    else if (b.type === "linkedModifier") typeResult = 1;

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
                    diceTemplateUpdate({
                      id: template.id,
                      changes: { name },
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
            >
              <DiceTemplatePart
                selectedCharacter={selectedCharacter}
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
}

function DamageTypeEditor({
  part,
  templateId,
}: {
  part: RRDiceTemplatePartWithDamage;
  templateId: RRDiceTemplateID;
}) {
  const dispatch = useServerDispatch();

  return (
    <label>
      Damage Type:
      <Select
        value={part.damage.type ?? ""}
        onChange={(damageType) =>
          dispatch({
            actions: [
              diceTemplatePartUpdate({
                templateId,
                id: part.id,
                changes: {
                  damage: {
                    type: empty2Null(damageType),
                    // FIXME: This currently overwrites the modifiers, but it is
                    // fine because we don't use them yet.
                    modifiers: [],
                  },
                },
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

function DiceMultipleRollEditor({
  part,
  templateId,
}: {
  part: RRDiceTemplatePartDice;
  templateId: RRDiceTemplateID;
}) {
  const dispatch = useServerDispatch();

  return (
    <label>
      Multiple:
      <Select
        value={part.modified}
        onChange={(modified) =>
          dispatch({
            actions: [
              diceTemplatePartUpdate({
                templateId,
                id: part.id,
                changes: { modified },
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
  templateId,
}: {
  part: RRDiceTemplatePartDice;
  templateId: RRDiceTemplateID;
}) {
  const dispatch = useServerDispatch();

  return (
    <label>
      Count:
      <SmartIntegerInput
        value={part.count}
        onChange={(count) =>
          dispatch({
            actions: [
              diceTemplatePartUpdate({
                templateId,
                id: part.id,
                changes: { count },
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
  templateId,
}: {
  part: RRDiceTemplatePartModifier;
  templateId: RRDiceTemplateID;
}) {
  const dispatch = useServerDispatch();

  return (
    <label>
      Modifier:
      <SmartIntegerInput
        value={part.number}
        onChange={(number) =>
          dispatch({
            actions: [
              diceTemplatePartUpdate({
                templateId,
                id: part.id,
                changes: { number },
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

function TemplateNoteEditor({ templateId }: { templateId: RRDiceTemplateID }) {
  const dispatch = useServerDispatch();
  const template = useServerState(
    (state) => state.diceTemplates.entities[templateId]
  );

  if (!template) {
    return null;
  }

  return (
    <div>
      <label>
        Category Index:
        <input
          value={template.categoryIndex.toString()}
          type="number"
          onChange={(event) =>
            dispatch({
              actions: [
                diceTemplateUpdate({
                  id: templateId,
                  changes: {
                    categoryIndex: Math.min(
                      event.target.valueAsNumber,
                      diceCategories.length - 1
                    ),
                  },
                }),
              ],
              optimisticKey: "categoryIndex",
              syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
            })
          }
        />
      </label>
      <label>
        Notes:
        <SmartTextareaInput
          value={template.notes}
          onChange={(notes) =>
            dispatch({
              actions: [
                diceTemplateUpdate({ id: templateId, changes: { notes } }),
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
}> = ({ part, template, children }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const dispatch = useServerDispatch();

  const templateParts = useServerStateRef((state) => {
    return state.diceTemplates.entities;
  });

  const deleteActions = (part: RRDiceTemplatePart): SyncedStateAction[] => {
    return [
      diceTemplatePartRemove({
        id: part.id,
        templateId: template.id,
      }),
      part.type === "template" && diceTemplateRemove(part.templateId),
      part.type === "template" &&
        templateParts.current[part.templateId]?.parts.flatMap((p) =>
          deleteActions(p)
        ),
    ].flatMap((a) => (a ? a : []));
  };

  const applyDelete = (part: RRDiceTemplatePart) => {
    dispatch(deleteActions(part));
  };

  return (
    <Popover
      content={
        <div onClick={(e) => e.stopPropagation()}>
          {(part.type === "dice" ||
            part.type === "linkedModifier" ||
            part.type === "modifier") && (
            <DamageTypeEditor part={part} templateId={template.id} />
          )}
          {part.type === "dice" && (
            <DiceCountEditor part={part} templateId={template.id} />
          )}
          {part.type === "dice" && (
            <DiceMultipleRollEditor part={part} templateId={template.id} />
          )}
          {part.type === "modifier" && (
            <ModifierNumberEditor part={part} templateId={template.id} />
          )}
          {part.type === "template" && (
            <TemplateNoteEditor templateId={part.templateId} />
          )}
          <Button className="red" onClick={() => applyDelete(part)}>
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
    selectedCharacter: RRCharacter | null;
    onClick?: () => void;
    editable: boolean;
  }
>(function DiceTemplatePart(
  {
    part,
    newIds,
    onRoll,
    selectedTemplateIds,
    selectedCharacter,
    onClick,
    editable,
  },
  ref
) {
  let content: JSX.Element;

  const styleFor = (part: RRDiceTemplatePartWithDamage) => ({
    background: colorForDamageType(part.damage.type),
    color: contrastColor(colorForDamageType(part.damage.type)),
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
          selectedCharacter={selectedCharacter}
          templateId={part.templateId}
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
