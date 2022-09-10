import React, { useState } from "react";
import {
  characterRemoveDiceTemplate,
  characterUpdateDiceTemplate,
} from "../../../shared/actions";
import {
  RRDiceTemplatePart,
  RRDiceTemplateID,
  RRMultipleRoll,
  RRDiceTemplateCategoryID,
  RRDiceTemplatePartWithDamage,
  colorForDamageType,
  RRCharacter,
  RRDiceTemplatePartID,
  RRCharacterID,
} from "../../../shared/state";
import { assertNever } from "../../../shared/util";
import { RRDiceTemplate } from "../../../shared/validation";
import { proficiencyStringToValue } from "../../diceUtils";
import { useMyActiveCharacters, useMyProps } from "../../myself";
import { useServerDispatch, useServerState } from "../../state";
import { contrastColor, modifierFromStat } from "../../util";
import { Popover } from "../Popover";
import { Button } from "../ui/Button";
import { DiceTemplate } from "./DiceTemplate";
import {
  CategoryEditor,
  DamageTypeEditor,
  DiceCountEditor,
  DiceMultipleRollEditor,
  ModifierNumberEditor,
  ProficiencyValueEditor,
  TemplateSettingsEditor,
} from "./DiceTemplateEditors";
import { SelectionPair } from "./DiceTemplates";

const removePartAction = (
  id: RRCharacterID,
  partId: RRDiceTemplatePartID,
  categoryId: RRDiceTemplateCategoryID,
  diceTemplate: RRDiceTemplate
) =>
  characterUpdateDiceTemplate({
    id,
    categoryId,
    template: {
      id: diceTemplate.id,
      changes: {
        parts: diceTemplate.parts.filter((p) => p.id !== partId),
      },
    },
  });

export const DiceTemplatePartMenuWrapper: React.FC<
  React.PropsWithChildren<{
    part: RRDiceTemplatePart;
    template: RRDiceTemplate;
    categoryId: RRDiceTemplateCategoryID;
    isTopLevel?: boolean;
  }>
> = ({ part, template, children, categoryId, isTopLevel }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const dispatch = useServerDispatch();
  const character = useMyActiveCharacters("id")[0]!;

  const applyDelete = (part: RRDiceTemplatePart) => {
    isTopLevel
      ? dispatch(
          characterRemoveDiceTemplate({
            id: character.id,
            categoryId,
            templateId: template.id,
          })
        )
      : dispatch(removePartAction(character.id, part.id, categoryId, template));
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
          {part.type === "template" && isTopLevel && (
            <CategoryEditor categoryId={categoryId} template={part.template} />
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

export const DiceTemplatePart = React.forwardRef<
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
            {part.name[0]!.toUpperCase() +
              part.name.substring(1, part.name === "level" ? 5 : 4)}
          </div>
        </div>
      );
      break;
    case "linkedProficiency":
      content = (
        <div className="dice-option" style={styleFor(part)}>
          <div className="dice-option-linked-modifier">
            {typeof part.proficiency === "number"
              ? part.proficiency
              : character?.attributes["proficiency"]
              ? Math.floor(
                  character.attributes["proficiency"] *
                    proficiencyStringToValue(part.proficiency)
                )
              : null}
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
          className="ml-1"
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
