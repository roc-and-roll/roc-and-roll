import { faEdit } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import {
  logEntryDiceRollAdd,
  characterAddDiceTemplate,
} from "../../../shared/actions";
import {
  RRDiceTemplateID,
  RRDiceTemplatePart,
  RRMultipleRoll,
  characterStatNames,
  RRDiceTemplatePartLinkedProficiency,
  RRDiceTemplateCategoryID,
  RRDiceTemplatePartLinkedModifier,
} from "../../../shared/state";
import { rrid } from "../../../shared/util";
import {
  RRDiceTemplate,
  RRDiceTemplateCategory,
} from "../../../shared/validation";
import { useMyProps, useMyActiveCharacter } from "../../myself";
import { useServerDispatch } from "../../state";
import { Button } from "../ui/Button";
import { evaluateDiceTemplatePart } from "../../diceUtils";
import { DiceTemplate } from "./DiceTemplate";
import {
  DiceTemplatePart,
  DiceTemplatePartMenuWrapper,
} from "./DiceTemplatePart";

export interface SelectionPair {
  template: RRDiceTemplate;
  modified: RRMultipleRoll;
}

export const DiceTemplates = React.memo(function DiceTemplates({
  category,
}: {
  category: RRDiceTemplateCategory;
}) {
  const [templatesEditable, setTemplatesEditable] = useState(false);
  const myself = useMyProps("id", "characterIds", "mainCharacterId");

  const dispatch = useServerDispatch();
  const newIds = useRef<RRDiceTemplateID[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<SelectionPair[]>(
    []
  );

  const character = useMyActiveCharacter("id", "stats", "attributes");

  const [, dropRef] = useDrop<
    RRDiceTemplatePart | RRDiceTemplatePart[],
    void,
    never
  >(
    () => ({
      accept: ["diceTemplatePart"],
      drop: (item, monitor) => {
        if (!character) return;
        if (Array.isArray(item)) {
          item = item.map((part) => {
            return { ...part, id: rrid<RRDiceTemplatePart>() };
          });
        }
        const action = characterAddDiceTemplate({
          categoryId: category.id,
          id: character.id,
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
    [category, character]
  );

  const doRoll = (crit: boolean = false) => {
    const parts = selectedTemplates.flatMap(({ template, modified }) =>
      template.parts.flatMap((p) =>
        evaluateDiceTemplatePart(p, modified, crit, character)
      )
    );
    if (parts.length < 1) return;

    const rollTemplates = selectedTemplates.flatMap(
      ({ template }) => category.templates.find((t) => t === template) ?? []
    );

    const countTemplateString = (templates: RRDiceTemplate[]) => {
      const templateTimes: Record<string, number> = {};
      templates.map(
        (template) =>
          (templateTimes[template.name] = templateTimes[template.name]
            ? templateTimes[template.name]! + 1
            : 1)
      );
      return Object.entries(templateTimes)
        .map(([key, value]) =>
          value > 1 ? value.toString() + "× " + key : key
        )
        .join(" ")
        .trim();
    };

    const rollName = countTemplateString(rollTemplates);
    const tooltip = countTemplateString(
      selectedTemplates.map(({ template }) => template)
    );

    dispatch(
      logEntryDiceRollAdd({
        silent: false,
        playerId: myself.id,
        payload: {
          tooltip: tooltip,
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
          characterIds: character ? [character.id] : null,
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
      const currentTemplates = current.map(({ template }) => template);
      const countForTemplate = (tid: RRDiceTemplate) =>
        selectedTemplates.filter(({ template }) => tid === template).length;

      const clicked = templates[templates.length - 1]!;

      if (event.ctrlKey) {
        // add parents if my count is bigger than their count
        const myCount = countForTemplate(clicked) + 1;
        const parents = templates.slice(0, templates.length - 1);
        const parentsToAdd = parents.flatMap<SelectionPair>((p) =>
          countForTemplate(p) >= myCount ? [] : { template: p, modified }
        );
        return [...current, ...parentsToAdd, { template: clicked, modified }];
      }
      if (event.shiftKey) {
        return [...current, { template: clicked, modified }];
      }

      return currentTemplates.includes(clicked)
        ? current.filter(({ template }) => template !== clicked)
        : [
            ...current,
            ...templates.flatMap<SelectionPair>((t) =>
              currentTemplates.includes(t) ? [] : { template: t, modified }
            ),
          ];
    });
  };

  return (
    <div
      className="dice-templates p-2"
      onContextMenu={(e) => {
        e.preventDefault();
        doRoll();
        setSelectedTemplates([]);
      }}
      onClick={() => {
        setSelectedTemplates([]);
      }}
    >
      {templatesEditable && <DicePicker />}

      <div className="flex mb-2">
        <Button
          title="Edit/Add Templates"
          onClick={() => setTemplatesEditable((b) => !b)}
        >
          <FontAwesomeIcon icon={faEdit} />
        </Button>
        <div className="grow"></div>
        {selectedTemplates.length > 0 && (
          <>
            <Button
              onClick={() => {
                doRoll();
                setSelectedTemplates([]);
              }}
            >
              Roll!
            </Button>
            <Button
              onClick={() => {
                doRoll(true);
                setSelectedTemplates([]);
              }}
            >
              Crit!
            </Button>
          </>
        )}
      </div>
      <div
        className="dice-templates-container grid grid-cols-2 gap-2"
        ref={dropRef}
      >
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
            isTopLevel={true}
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
  );
});

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

  const proficiencyPart: RRDiceTemplatePartLinkedProficiency = {
    id: rrid<RRDiceTemplatePart>(),
    type: "linkedProficiency" as const,
    damage: { type: null },
    proficiency: "proficient",
  };

  const initiativePart: RRDiceTemplatePartLinkedModifier = {
    id: rrid<RRDiceTemplatePart>(),
    type: "linkedModifier" as const,
    damage: { type: null },
    name: "initiative",
  };

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
      {
        //<DiceHolder diceTemplateParts={diceHolder} />
        //<Button onClick={() => setDiceHolder([])}>EMPTY</Button>
      }
    </div>
  );
}

function PickerDiceTemplateNested() {
  const [, dragRef] = useDrag<Record<string, never>, void, null>(
    () => ({
      type: "diceTemplateNested",
      item: {},
    }),
    []
  );

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
  const [, dragRef] = useDrag<RRDiceTemplatePart, void, null>(
    () => ({
      type: "diceTemplatePart",
      item: part,
    }),
    [part]
  );

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
