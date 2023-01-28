import {
  faMinusCircle,
  faPlusCircle,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import React, { useState } from "react";
import { logEntryDiceRollAdd } from "../../../shared/actions";
import {
  characterStatNames,
  RRCharacter,
  RRMultipleRoll,
  skillNames,
} from "../../../shared/state";
import { RRDiceTemplate } from "../../../shared/validation";
import {
  evaluateDiceTemplatePart,
  getModifierForTemplate,
} from "../../diceUtils";
import { useMyProps } from "../../myself";
import { useServerDispatch } from "../../state";
import { signedModifierString } from "../../util";

export const GeneratedDiceTemplates = React.memo(
  function GeneratedDiceTemplates({
    templates: abilityTemplates,
  }: {
    templates: {
      ability:
        | (typeof skillNames)[number]
        | (typeof characterStatNames)[number];
      templates: {
        character: Pick<RRCharacter, "id" | "attributes" | "stats">;
        template: RRDiceTemplate;
      }[];
    }[];
  }) {
    return (
      <div className="grid grid-cols-2 gap-2 p-2">
        {abilityTemplates.map((template) => (
          <GeneratedDiceTemplate
            key={template.ability}
            abilityTemplate={template}
          />
        ))}
      </div>
    );
  }
);

function GeneratedDiceTemplate({
  abilityTemplate,
}: {
  abilityTemplate: {
    ability: (typeof skillNames)[number] | (typeof characterStatNames)[number];
    templates: {
      character: Pick<RRCharacter, "id" | "attributes" | "stats">;
      template: RRDiceTemplate;
    }[];
  };
}) {
  const dispatch = useServerDispatch();
  const [isHovered, setIsHovered] = useState(false);
  const myself = useMyProps("id");

  const doRoll = (modified: RRMultipleRoll) => {
    const rolls = abilityTemplate.templates.flatMap(
      ({ character, template }) => {
        const parts = template.parts.flatMap((p) =>
          evaluateDiceTemplatePart(p, modified, false, character)
        );
        if (parts.length < 1) return [];

        return logEntryDiceRollAdd({
          silent: false,
          playerId: myself.id,
          payload: {
            characterIds: [character.id],
            tooltip: null,
            rollType: "attack", // TODO
            rollName: template.name,
            diceRollTree:
              parts.length === 1
                ? parts[0]!
                : {
                    type: "term",
                    operator: "+",
                    operands: parts,
                  },
          },
        });
      }
    );
    dispatch(rolls);
  };
  function handleMoueLeave() {
    setIsHovered(false);
  }
  function handleMouseEnter() {
    setIsHovered(true);
  }

  const modifierUI =
    abilityTemplate.templates.length === 1 ? (
      signedModifierString(
        getModifierForTemplate(
          abilityTemplate.templates[0]!.template,
          abilityTemplate.templates[0]!.character
        )
      )
    ) : (
      <>
        {
          // TODO: Use faPeopleGroup once we upgrade to FontAwesome 6
        }
        {abilityTemplate.templates.length} <FontAwesomeIcon icon={faUsers} />
      </>
    );

  return (
    <div
      onClick={() => doRoll("none")}
      title="Click to Roll"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMoueLeave}
      className={clsx(
        "generated-dice-templates select-none",
        isHovered ? "hovered" : ""
      )}
    >
      <p className="template-name">{abilityTemplate.ability}</p>
      <p className="modifier-value">{modifierUI}</p>
      {isHovered && (
        <div
          className="modifier-button disadvantage"
          onClick={(event) => {
            event.stopPropagation();
            doRoll("disadvantage");
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
            doRoll("advantage");
          }}
        >
          <FontAwesomeIcon icon={faPlusCircle} />
        </div>
      )}
    </div>
  );
}
