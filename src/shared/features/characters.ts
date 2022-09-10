import { createEntityAdapter, createReducer } from "@reduxjs/toolkit";
import {
  characterAdd,
  characterUpdate,
  characterRemove,
  characterUpdateHPRelatively,
  mapObjectRemove,
  characterAddDiceTemplate,
  characterAddDiceTemplateCategory,
  characterUpdateDiceTemplatePart,
  characterUpdateDiceTemplateCategory,
  characterRemoveDiceTemplate,
  characterAddDiceTemplatePart,
  characterRemoveDiceTemplatePart,
  characterUpdateDiceTemplate,
  characterDeleteDiceTemplateCategory,
  characterAddSpell,
  characterDeleteSpell,
  characterUpdateSpell,
  characterAddDie,
  characterUpdateDie,
} from "../actions";
import {
  EntityCollection,
  initialSyncedState,
  RRCharacter,
  RRCharacterID,
  RRDiceTemplateCategoryID,
  RRDiceTemplateID,
  RRDiceTemplatePartID,
} from "../state";
import { clamp } from "../util";
import { RRDiceTemplate } from "../validation";

const charactersAdapter = createEntityAdapter<RRCharacter>();

export const charactersReducer = createReducer(
  initialSyncedState.characters,
  (builder) => {
    builder
      .addCase(characterAdd, charactersAdapter.addOne)
      .addCase(characterUpdate, charactersAdapter.updateOne)
      .addCase(characterRemove, charactersAdapter.removeOne)
      .addCase(mapObjectRemove, (state, action) => {
        if (action.payload.removeTemplateId) {
          return charactersAdapter.removeOne(
            state,
            action.payload.removeTemplateId
          );
        }
        return state;
      })

      .addCase(characterUpdateHPRelatively, (state, action) => {
        const character = state.entities[action.payload.id];
        let newTemporaryHP, newHP;
        if (character) {
          if (action.payload.relativeHP < 0) {
            const hpToLose = action.payload.relativeHP * -1;

            newTemporaryHP = Math.max(0, character.temporaryHP - hpToLose);
            newHP =
              character.hp - Math.max(0, hpToLose - character.temporaryHP);
          } else {
            newHP = character.hp + action.payload.relativeHP;
          }

          character.hp = clamp(
            0,
            newHP,
            character.maxHP + character.maxHPAdjustment
          );
          character.temporaryHP = newTemporaryHP ?? character.temporaryHP;
        }
      })

      .addCase(characterAddSpell, (state, action) => {
        const character = state.entities[action.payload.id];
        character?.spells.push(action.payload.spell);
      })
      .addCase(characterUpdateSpell, (state, action) => {
        const character = state.entities[action.payload.id];
        const spell = character?.spells.find(
          (spell) => spell.id === action.payload.spell.id
        );
        if (!spell) return;
        Object.assign(spell, action.payload.spell.changes);
      })
      .addCase(characterDeleteSpell, (state, action) => {
        const character = state.entities[action.payload.id];
        const index = character?.spells.findIndex(
          (spell) => spell.id === action.payload.spellId
        );
        if (index !== undefined && index >= 0) {
          character?.spells.splice(index, 1);
        }
      })

      .addCase(characterAddDiceTemplate, (state, action) => {
        const character = state.entities[action.payload.id];
        character?.diceTemplateCategories
          .find((c) => c.id === action.payload.categoryId)
          ?.templates.push(action.payload.template);
      })

      .addCase(characterAddDiceTemplateCategory, (state, action) => {
        const character = state.entities[action.payload.id];
        character?.diceTemplateCategories.push(action.payload.category);
      })

      .addCase(characterUpdateDiceTemplateCategory, (state, action) => {
        const character = state.entities[action.payload.id];
        const category = character?.diceTemplateCategories.find(
          (c) => c.id === action.payload.category.id
        );
        if (!category) return;
        Object.assign(category, action.payload.category.changes);
      })

      .addCase(characterDeleteDiceTemplateCategory, (state, action) => {
        const character = state.entities[action.payload.id];
        const index = character?.diceTemplateCategories.findIndex(
          (c) => c.id === action.payload.categoryId
        );
        if (index !== undefined && index >= 0) {
          character?.diceTemplateCategories.splice(index, 1);
        }
      })

      .addCase(characterRemoveDiceTemplate, (state, action) => {
        const character = state.entities[action.payload.id];
        const templates = character?.diceTemplateCategories.find(
          (c) => c.id === action.payload.categoryId
        )?.templates;
        const index = templates?.findIndex(
          (t) => t.id === action.payload.templateId
        );
        if (index !== undefined && index >= 0) {
          templates?.splice(index, 1);
        }
      })

      .addCase(characterUpdateDiceTemplate, (state, action) => {
        const template = getTemplateForPayload(state, {
          ...action.payload,
          templateId: action.payload.template.id,
        });
        if (!template) return;
        Object.assign(template, action.payload.template.changes);
      })

      .addCase(characterUpdateDiceTemplatePart, (state, action) => {
        const part = getPartForPayload(state, action.payload);
        if (!part) return;
        Object.assign(part, action.payload.part.changes);
      })

      .addCase(characterAddDiceTemplatePart, (state, action) => {
        const template = getTemplateForPayload(state, action.payload);
        if (!template) return;
        template.parts.push(action.payload.part);
      })

      .addCase(characterRemoveDiceTemplatePart, (state, action) => {
        const template = getTemplateForPayload(state, action.payload);
        if (!template) return;
        const index = template.parts.findIndex(
          (p) => p.id === action.payload.partId
        );
        if (index >= 0) {
          template.parts.splice(index, 1);
        }
      })

      .addCase(characterAddDie, (state, action) => {
        const character = state.entities[action.payload.id];
        character?.dice.push(action.payload.die);
      })

      .addCase(characterUpdateDie, (state, action) => {
        const character = state.entities[action.payload.id];
        if (!character) return;

        const die = character.dice.find((d) => d.id === action.payload.die.id);
        if (!die) return;
        Object.assign(die, action.payload.die.changes);
      });
  }
);

function getTemplateForPayload(
  state: EntityCollection<RRCharacter>,
  payload: {
    templateId: RRDiceTemplateID;
    id: RRCharacterID;
    categoryId: RRDiceTemplateCategoryID;
  }
) {
  const character = state.entities[payload.id];
  return getTemplateForId(
    payload.templateId,
    character?.diceTemplateCategories.find((c) => c.id === payload.categoryId)
      ?.templates ?? []
  );
}

function getPartForPayload(
  state: EntityCollection<RRCharacter>,
  payload: {
    templateId: RRDiceTemplateID;
    id: RRCharacterID;
    categoryId: RRDiceTemplateCategoryID;
    part: { id: RRDiceTemplatePartID };
  }
) {
  return getTemplateForPayload(state, payload)?.parts.find(
    (p) => p.id === payload.part.id
  );
}

function getTemplateForId(
  id: RRDiceTemplateID,
  templates: RRDiceTemplate[]
): RRDiceTemplate | null {
  for (const template of templates) {
    if (template.id === id) {
      return template;
    }
    for (const part of template.parts) {
      if (part.type === "template") {
        const ret = getTemplateForId(id, [part.template]);
        if (ret !== null) {
          return ret;
        }
      }
    }
  }
  return null;
}
