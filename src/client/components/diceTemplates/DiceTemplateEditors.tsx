import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import {
  characterAddDiceTemplate,
  characterRemoveDiceTemplate,
  characterUpdateDiceTemplate,
  characterUpdateDiceTemplatePart,
  characterUpdateDie,
} from "../../../shared/actions";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../../shared/constants";
import {
  RRDiceTemplatePartDice,
  RRDiceTemplateCategoryID,
  multipleRollValues,
  RRDiceTemplatePartModifier,
  RRDiceTemplatePartLinkedProficiency,
  damageTypes,
  RRDiceTemplatePartWithDamage,
  RRDiceTemplatePart,
  RRDiceTemplatePartID,
  proficiencyValueStrings,
  RRCharacterID,
} from "../../../shared/state";
import { empty2Null } from "../../../shared/util";
import { RRDiceTemplate } from "../../../shared/validation";
import { useMyActiveCharacters } from "../../myself";
import { useServerDispatch } from "../../state";
import { getProficiencyValueString, signedModifierString } from "../../util";
import { iconMap } from "../hud/Actions";
import { Select } from "../ui/Select";
import { SmartIntegerInput, SmartTextareaInput } from "../ui/TextInput";

const updatePartAction = (
  id: RRCharacterID,
  partId: RRDiceTemplatePartID,
  categoryId: RRDiceTemplateCategoryID,
  diceTemplate: RRDiceTemplate,
  changes: Partial<RRDiceTemplatePart>
) =>
  characterUpdateDiceTemplatePart({
    id,
    categoryId,
    templateId: diceTemplate.id,
    part: {
      id: partId,
      changes,
    },
  });

export function DamageTypeEditor({
  parts,
  template,
  categoryId,
  characterId,
}: {
  parts: RRDiceTemplatePartWithDamage[];
  template?: RRDiceTemplate;
  categoryId?: RRDiceTemplateCategoryID;
  characterId?: RRCharacterID;
}) {
  const dispatch = useServerDispatch();
  const selected = useMyActiveCharacters("id")[0]!;

  return (
    <label>
      Damage Type:
      <Select
        value={parts[0]!.damage.type ?? ""}
        onChange={(damageType) =>
          dispatch({
            actions: parts.map((part) =>
              categoryId && template
                ? updatePartAction(selected.id, part.id, categoryId, template, {
                    damage: { type: empty2Null(damageType) },
                  })
                : characterUpdateDie({
                    id: characterId!,
                    die: {
                      id: part.id,
                      changes: { damage: { type: empty2Null(damageType) } },
                    },
                  })
            ),
            optimisticKey: "damageType",
            syncToServerThrottle: 0,
          })
        }
        options={damageTypes.map((t) => ({ value: t ?? "", label: t ?? "" }))}
      />
    </label>
  );
}

export function DiceMultipleRollEditor({
  part,
  template,
  categoryId,
}: {
  part: RRDiceTemplatePartDice;
  template: RRDiceTemplate;
  categoryId: RRDiceTemplateCategoryID;
}) {
  const dispatch = useServerDispatch();
  const selected = useMyActiveCharacters("id")[0]!;

  return (
    <label>
      Multiple:
      <Select
        value={part.modified}
        onChange={(modified) =>
          dispatch({
            actions: [
              updatePartAction(selected.id, part.id, categoryId, template, {
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

export function DiceCountEditor({
  part,
  template,
  categoryId,
}: {
  part: RRDiceTemplatePartDice;
  template: RRDiceTemplate;
  categoryId: RRDiceTemplateCategoryID;
}) {
  const dispatch = useServerDispatch();
  const selected = useMyActiveCharacters("id")[0]!;

  return (
    <label>
      Count:
      <SmartIntegerInput
        value={part.count}
        onChange={(count) =>
          dispatch({
            actions: [
              updatePartAction(selected.id, part.id, categoryId, template, {
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

export function ModifierNumberEditor({
  part,
  template,
  categoryId,
}: {
  part: RRDiceTemplatePartModifier;
  template: RRDiceTemplate;
  categoryId: RRDiceTemplateCategoryID;
}) {
  const dispatch = useServerDispatch();
  const selected = useMyActiveCharacters("id")[0]!;

  return (
    <label>
      Modifier:
      <SmartIntegerInput
        value={part.number}
        onChange={(number) =>
          dispatch({
            actions: [
              updatePartAction(selected.id, part.id, categoryId, template, {
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

export function ProficiencyValueEditor({
  part,
  template,
  categoryId,
}: {
  part: RRDiceTemplatePartLinkedProficiency;
  template: RRDiceTemplate;
  categoryId: RRDiceTemplateCategoryID;
}) {
  const dispatch = useServerDispatch();
  const selected = useMyActiveCharacters("id")[0]!;

  return (
    <label>
      Proficiency:
      {typeof part.proficiency === "number" ? (
        <p>{signedModifierString(part.proficiency)}</p>
      ) : (
        <Select
          options={[
            ...proficiencyValueStrings.map((t) => ({
              value: t,
              label: getProficiencyValueString(t),
            })),
          ]}
          value={part.proficiency}
          onChange={(newValue: (typeof proficiencyValueStrings)[number]) => {
            return dispatch({
              actions: [
                updatePartAction(selected.id, part.id, categoryId, template, {
                  proficiency: newValue,
                }),
              ],
              optimisticKey: "proficiency",
              syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
            });
          }}
        />
      )}
    </label>
  );
}

export function CategoryEditor({
  categoryId,
  template,
}: {
  categoryId: RRDiceTemplateCategoryID;
  template: RRDiceTemplate;
}) {
  const dispatch = useServerDispatch();
  const selected = useMyActiveCharacters("id", "diceTemplateCategories")[0];

  if (!selected) return null;

  return (
    <label>
      Category:
      {selected.diceTemplateCategories.map((category) => (
        <label
          key={category.id}
          className="radio-label"
          title={category.categoryName}
        >
          <input
            type="radio"
            name="icon"
            value={category.id}
            checked={categoryId === category.id}
            onChange={(e) =>
              dispatch({
                actions: [
                  characterRemoveDiceTemplate({
                    id: selected.id,
                    categoryId: categoryId,
                    templateId: template.id,
                  }),
                  characterAddDiceTemplate({
                    id: selected.id,
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
  );
}

export function TemplateSettingsEditor({
  categoryId,
  template,
}: {
  categoryId: RRDiceTemplateCategoryID;
  template: RRDiceTemplate;
}) {
  const dispatch = useServerDispatch();
  const selected = useMyActiveCharacters("id", "diceTemplateCategories")[0];

  if (!selected) return null;
  return (
    <div>
      <label>
        Notes:
        <SmartTextareaInput
          value={template.notes}
          onChange={(notes) =>
            dispatch({
              actions: [
                characterUpdateDiceTemplate({
                  id: selected.id,
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
