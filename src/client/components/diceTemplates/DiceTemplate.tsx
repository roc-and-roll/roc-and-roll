import clsx from "clsx";
import React, { useRef, useState, useEffect } from "react";
import { useDrop } from "react-dnd";
import {
  characterAddDiceTemplatePart,
  characterUpdateDiceTemplate,
} from "../../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../../shared/constants";
import {
  RRDiceTemplateCategoryID,
  RRDiceTemplateID,
  RRMultipleRoll,
  RRDiceTemplatePart,
} from "../../../shared/state";
import { rrid } from "../../../shared/util";
import { RRDiceTemplate } from "../../../shared/validation";
import { useMyActiveCharacter } from "../../myself";
import { useRRSettings } from "../../settings";
import { useServerDispatch } from "../../state";
import { Button } from "../ui/Button";
import { SmartTextInput } from "../ui/TextInput";
import {
  DiceTemplatePart,
  DiceTemplatePartMenuWrapper,
} from "./DiceTemplatePart";
import { SelectionPair } from "./DiceTemplates";

export const DiceTemplate = React.memo(function DiceTemplate({
  className,
  template,
  categoryId,
  newIds,
  onRoll,
  selectedTemplateIds,
  editable,
  isChildTemplate,
}: {
  className?: string;
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
  const character = useMyActiveCharacter("id")!;
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
      accept: ["diceTemplatePart", "diceTemplateNested"],
      drop: (item, monitor) => {
        switch (monitor.getItemType()) {
          case "diceTemplateNested": {
            item = {
              id: rrid<RRDiceTemplatePart>(),
              type: "template",
              template: {
                id: rrid<RRDiceTemplate>(),
                name: "",
                notes: "",
                parts: [],
                rollType: "attack",
              },
            } as RRDiceTemplatePart;
            break;
          }
          case "diceTemplatePart":
            item = {
              ...item,
              id: rrid<RRDiceTemplatePart>(),
            } as RRDiceTemplatePart;
            break;
          //case "diceTemplate":
          //item = (item as RRDiceTemplatePart[]).map((part) => {
          //return { ...part, id: rrid<RRDiceTemplatePart>() };
          //});
          //break;
          default:
            throw new Error("Unsupported Drop Type!");
        }

        dispatch(
          characterAddDiceTemplatePart({
            id: character.id,
            categoryId,
            templateId: template.id,
            part: item,
          })
        );
      },
      canDrop: (_item, monitor) => monitor.isOver({ shallow: true }),
    }),
    [categoryId, character.id, template.id]
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
    ({ template: t }) => template === t
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
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={clsx(
        "dice-template select-none",
        {
          created: template,
          selected: selectionCount > 0,
          expanded: expanded,
        },
        className
      )}
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
                    characterUpdateDiceTemplate({
                      id: character.id,
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
