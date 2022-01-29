import { faMinusCircle, faPlusCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import clsx from "clsx";
import React, { useState } from "react";
import { logEntryDiceRollAdd } from "../../../shared/actions";
import { RRMultipleRoll } from "../../../shared/state";
import { RRDiceTemplate } from "../../../shared/validation";
import {
  evaluateDiceTemplatePart,
  getModifierForTemplate,
} from "../../diceUtils";
import { useMyProps, useMySelectedCharacters } from "../../myself";
import { useServerState, useServerDispatch } from "../../state";
import { signedModifierString } from "../../util";

export const GeneratedDiceTemplates = React.memo(
  function GeneratedDiceTemplates({
    templates,
  }: {
    templates: RRDiceTemplate[];
  }) {
    return (
      <div className="grid grid-cols-2 gap-2 p-2">
        {templates.map((template) => (
          <GeneratedDiceTemplate key={template.id} template={template} />
        ))}
      </div>
    );
  }
);

function GeneratedDiceTemplate({ template }: { template: RRDiceTemplate }) {
  const myself = useMyProps("id", "mainCharacterId");

  const selectedCharacters = useMySelectedCharacters(
    "id",
    "stats",
    "attributes"
  );
  const mainCharacter = useServerState((state) =>
    myself.mainCharacterId
      ? state.characters.entities[myself.mainCharacterId] ?? null
      : null
  );

  const character =
    selectedCharacters.length === 1 ? selectedCharacters[0]! : mainCharacter;

  const dispatch = useServerDispatch();
  const [isHovered, setIsHovered] = useState(false);

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
          diceRollTree:
            parts.length === 1
              ? parts[0]!
              : {
                  type: "term",
                  operator: "+",
                  operands: parts,
                },
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

  const modifierString = signedModifierString(
    getModifierForTemplate(template, character)
  );

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
