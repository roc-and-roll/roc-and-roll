import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import {
  playerAddDiceTemplate,
  playerRemoveDiceTemplate,
  playerUpdateDiceTemplate,
  playerUpdateDiceTemplatePart,
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
  RRPlayerID,
  proficiencyValueStrings,
} from "../../../shared/state";
import { empty2Null } from "../../../shared/util";
import { RRDiceTemplate } from "../../../shared/validation";
import { useMyProps } from "../../myself";
import { useServerDispatch } from "../../state";
import { getProficiencyValueString, signedModifierString } from "../../util";
import { iconMap } from "../hud/Actions";
import { Select } from "../ui/Select";
import { SmartIntegerInput, SmartTextareaInput } from "../ui/TextInput";

const updatePartAction = (
  myId: RRPlayerID,
  partId: RRDiceTemplatePartID,
  categoryId: RRDiceTemplateCategoryID,
  diceTemplate: RRDiceTemplate,
  changes: Partial<RRDiceTemplatePart>
) =>
  playerUpdateDiceTemplatePart({
    id: myId,
    categoryId,
    templateId: diceTemplate.id,
    part: {
      id: partId,
      changes,
    },
  });

export function DamageTypeEditor({
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
  const myself = useMyProps("id");

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
          onChange={(newValue: typeof proficiencyValueStrings[number]) => {
            return dispatch({
              actions: [
                updatePartAction(myself.id, part.id, categoryId, template, {
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
  const myself = useMyProps("diceTemplateCategories", "id");

  return (
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
            checked={categoryId === category.id}
            onChange={(e) =>
              dispatch({
                actions: [
                  playerRemoveDiceTemplate({
                    id: myself.id,
                    categoryId: categoryId,
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
  const myself = useMyProps("diceTemplateCategories", "id");

  return (
    <div>
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
