import React, { useRef, useEffect, useState } from "react";
import {
  characterUpdate,
  characterRemove,
  characterTemplateUpdate,
  characterTemplateRemove,
  assetImageUpdate,
} from "../../../shared/actions";
import {
  conditionNames,
  RRCharacter,
  RRCharacterCondition,
  RRCharacterTemplate,
} from "../../../shared/state";
import { useFileUpload } from "../../files";
import { useServerDispatch } from "../../state";
import { Button } from "../ui/Button";
import { SmartColorInput } from "../ui/ColorInput";
import { SmartIntegerInput, SmartTextInput, TextInput } from "../ui/TextInput";
import clsx from "clsx";
import blue from "./blue.svg";
import green from "./green.svg";
import orange from "./orange_transparent.svg";
import purple from "./purple.svg";
import red from "./red.svg";
import teal from "./teal.svg";
import yellow from "./yellow.svg";
import blinded from "../../../third-party/icons/conditions/blinded.png";
import charmed from "../../../third-party/icons/conditions/charmed.png";
import deafened from "../../../third-party/icons/conditions/deafened.png";
import exhaustion from "../../../third-party/icons/conditions/exhaustion.png";
import frightened from "../../../third-party/icons/conditions/frightened.png";
import grappled from "../../../third-party/icons/conditions/grappled.png";
import incapacitated from "../../../third-party/icons/conditions/incapacitated.png";
import invisible from "../../../third-party/icons/conditions/invisible.png";
import paralyzed from "../../../third-party/icons/conditions/paralyzed.png";
import petrified from "../../../third-party/icons/conditions/petrified.png";
import poisoned from "../../../third-party/icons/conditions/poisoned.png";
import prone from "../../../third-party/icons/conditions/prone.png";
import restrained from "../../../third-party/icons/conditions/restrained.png";
import stunned from "../../../third-party/icons/conditions/stunned.png";
import unconscious from "../../../third-party/icons/conditions/unconscious.png";
import concealed from "../../../third-party/icons/conditions/concealed.png";
import disarmed from "../../../third-party/icons/conditions/disarmed.png";
import hidden from "../../../third-party/icons/conditions/hidden.png";
import raging from "../../../third-party/icons/conditions/raging.png";
import surprised from "../../../third-party/icons/conditions/surprised.png";
import speedometer from "../../../third-party/game-icons.net/ffffff/transparent/1x1/delapouite/speedometer.svg";
import tortoise from "../../../third-party/game-icons.net/ffffff/transparent/1x1/delapouite/tortoise.svg";
import snail from "../../../third-party/game-icons.net/ffffff/transparent/1x1/lorc/snail.svg";
import voodooDoll from "../../../third-party/game-icons.net/ffffff/transparent/1x1/lorc/voodoo-doll.svg";
import bullseye from "../../../third-party/game-icons.net/ffffff/transparent/1x1/skoll/bullseye.svg";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../../shared/constants";
import {
  faHandSparkles,
  faSkullCrossbones,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useConfirm } from "../../dialog-boxes";
import { CharacterPreview } from "./CharacterPreview";
import { CharacterSheetEditor } from "./CharacterSheetEditor";
import { Collapsible } from "../Collapsible";
import { Auras } from "./Auras";
import { FileInput } from "../FileInput";

export interface ConditionWithIcon {
  name: RRCharacterCondition;
  icon: string;
}

export const conditionIcons = {
  blue: blue,
  green: green,
  orange: orange,
  purple: purple,
  red: red,
  teal: teal,
  yellow: yellow,
  blinded: blinded,
  charmed: charmed,
  deafened: deafened,
  exhaustion: exhaustion,
  frightened: frightened,
  grappled: grappled,
  incapacitated: incapacitated,
  invisible: invisible,
  paralyzed: paralyzed,
  petrified: petrified,
  poisoned: poisoned,
  prone: prone,
  restrained: restrained,
  stunned: stunned,
  unconscious: unconscious,
  concealed: concealed,
  disarmed: disarmed,
  hidden: hidden,
  raging: raging,
  surprised: surprised,
  hasted: speedometer,
  cursed: voodooDoll,
  "hunters mark": bullseye,
  polymorphed: snail,
  slowed: tortoise,
  dead: faSkullCrossbones,
  concentrating: faHandSparkles,
} as const;

export function CharacterEditor({
  character,
  wasJustCreated,
  onClose,
  onNameFirstEdited,
  isTemplate,
}: {
  character: RRCharacter | RRCharacterTemplate;
  onClose: () => void;
  wasJustCreated: boolean;
  onNameFirstEdited: () => void;
  isTemplate?: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const [isUploading, upload] = useFileUpload();
  const confirm = useConfirm();

  const dispatch = useServerDispatch();
  const updateFunc = isTemplate ? characterTemplateUpdate : characterUpdate;
  const removeFunc = isTemplate ? characterTemplateRemove : characterRemove;

  const updateImage = async () => {
    if (!fileInput.current) {
      return;
    }

    const uploadedFiles = await upload(fileInput.current.files, "image");

    const image = uploadedFiles[0];
    if (image) {
      dispatch(
        assetImageUpdate({
          id: character.tokenImageAssetId,
          changes: {
            blurhash: image.blurhash,
            width: image.width,
            height: image.height,
            location: {
              type: "local",
              filename: image.filename,
              originalFilename: image.originalFilename,
              mimeType: image.mimeType,
            },
          },
        })
      );
    }

    fileInput.current.value = "";
  };

  const setConditions = (
    updater: React.SetStateAction<RRCharacter["conditions"]>
  ) =>
    dispatch((state) => {
      const oldConditions =
        state[isTemplate ? "characterTemplates" : "characters"].entities[
          character.id
        ]?.conditions;

      if (oldConditions === undefined) {
        return [];
      }

      const newConditions =
        typeof updater === "function" ? updater(oldConditions) : updater;

      return {
        actions: [
          updateFunc({
            id: character.id,
            changes: { conditions: newConditions },
          }),
        ],
        optimisticKey: "conditions",
        syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
      };
    });

  useEffect(() => {
    if (fileInput.current === null || nameInput.current === null) return;

    fileInput.current.value = "";
    nameInput.current.focus();
    if (wasJustCreated) nameInput.current.select();
  }, [character.id, wasJustCreated]);

  useEffect(() => {
    if (wasJustCreated) onNameFirstEdited();
  }, [character.name, onNameFirstEdited, wasJustCreated]);

  const remove = async () => {
    if (
      await confirm(
        `Do you really want to delete this character${
          isTemplate ? " template" : ""
        } forever? This will _not_ just delete the token, but the entire character${
          isTemplate ? " template" : ""
        }!`
      )
    ) {
      dispatch(removeFunc(character.id));
      onClose();
    }
  };

  return (
    <div className="token-popup" onMouseDown={(e) => e.stopPropagation()}>
      <Button className="popover-close" onClick={onClose}>
        ×
      </Button>
      <CharacterPreview character={character} />
      <div>
        <label>
          Name:{" "}
          <SmartTextInput
            ref={nameInput}
            value={character.name}
            onChange={(name) =>
              dispatch({
                actions: [updateFunc({ id: character.id, changes: { name } })],
                optimisticKey: "name",
                syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
              })
            }
          />
        </label>
      </div>
      <div>
        <label>
          Visible to GM only:{" "}
          <input
            type="checkbox"
            checked={character.visibility === "gmOnly"}
            onChange={(e) =>
              dispatch({
                actions: [
                  updateFunc({
                    id: character.id,
                    changes: {
                      visibility: e.target.checked ? "gmOnly" : "everyone",
                    },
                  }),
                ],
                optimisticKey: "visibility",
                syncToServerThrottle: 0,
              })
            }
          />
        </label>
      </div>
      <Collapsible title="Hit Point Editor">
        <HPEditor character={character} updateFunc={updateFunc} />
      </Collapsible>
      <Collapsible title="Character Editor" defaultCollapsed={true}>
        <CharacterSheetEditor character={character} isTemplate={isTemplate} />
      </Collapsible>
      <Collapsible title="Auras" defaultCollapsed={true}>
        <Auras character={character} isTemplate={isTemplate} />
      </Collapsible>
      <Collapsible title="Conditions" defaultCollapsed={true}>
        <ConditionPicker
          conditions={character.conditions}
          setConditions={setConditions}
        />
      </Collapsible>
      <Collapsible title="Token Settings" defaultCollapsed={true}>
        <div>
          <label>
            Token border color:{" "}
            <SmartColorInput
              value={character.tokenBorderColor}
              onChange={(tokenBorderColor) =>
                dispatch({
                  actions: [
                    updateFunc({
                      id: character.id,
                      changes: { tokenBorderColor },
                    }),
                  ],
                  optimisticKey: "tokenBorderColor",
                  syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
                })
              }
            />
          </label>
        </div>
        <div>
          <label>
            Image:{" "}
            <FileInput
              disabled={isUploading}
              onChange={updateImage}
              ref={fileInput}
            />
          </label>
        </div>
        <div>
          <label>
            Size in #squares:{" "}
            <SmartIntegerInput
              value={character.scale}
              min={1}
              placeholder="scale"
              onChange={(scale) =>
                dispatch({
                  actions: [
                    updateFunc({ id: character.id, changes: { scale } }),
                  ],
                  optimisticKey: "scale",
                  syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
                })
              }
            />
          </label>
        </div>
      </Collapsible>
      <Collapsible title="Delete" defaultCollapsed={true}>
        <Button className="red" onClick={remove}>
          delete character {isTemplate && "template"}
        </Button>
      </Collapsible>
    </div>
  );
}

function HPEditor({
  character,
  updateFunc,
}: {
  character: RRCharacter | RRCharacterTemplate;
  updateFunc: typeof characterTemplateUpdate | typeof characterUpdate;
}) {
  const dispatch = useServerDispatch();

  return (
    <div className="token-hp-editor">
      <div className="top-row">
        <label>
          HP
          <SmartIntegerInput
            value={character.hp}
            min={0}
            placeholder="HP"
            onChange={(hp) =>
              dispatch({
                actions: [updateFunc({ id: character.id, changes: { hp } })],
                optimisticKey: "hp",
                syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
              })
            }
          />
        </label>
        <label>
          Max HP
          <SmartIntegerInput
            value={character.maxHP}
            min={0}
            placeholder="Max HP"
            onChange={(maxHP) =>
              dispatch({
                actions: [updateFunc({ id: character.id, changes: { maxHP } })],
                optimisticKey: "maxHP",
                syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
              })
            }
          />
        </label>
        <label>
          Temp HP
          <SmartIntegerInput
            value={character.temporaryHP}
            min={0}
            placeholder="Temp HP"
            onChange={(temporaryHP) =>
              dispatch({
                actions: [
                  updateFunc({ id: character.id, changes: { temporaryHP } }),
                ],
                optimisticKey: "temporaryHP",
                syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
              })
            }
          />
        </label>
      </div>
      <div>
        <small>
          you can also edit hp by clicking on the hp in the healthbar of your
          token on the map
        </small>
      </div>
      <div>
        <label>
          Max HP Adjustment
          <SmartIntegerInput
            value={character.maxHPAdjustment}
            placeholder="max HP adjustment"
            onChange={(maxHPAdjustment) =>
              dispatch({
                actions: [
                  updateFunc({
                    id: character.id,
                    changes: { maxHPAdjustment },
                  }),
                ],
                optimisticKey: "maxHPAdjustment",
                syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
              })
            }
          />
        </label>
        <small>
          Adjust your max HP temporarily, e.g., due to the effect of a spell.
        </small>
      </div>
    </div>
  );
}

function ConditionPicker({
  conditions,
  setConditions,
}: {
  conditions: RRCharacterCondition[];
  setConditions: React.Dispatch<React.SetStateAction<RRCharacterCondition[]>>;
}) {
  const [filter, setFilter] = useState("");
  return (
    <>
      <TextInput
        type="search"
        placeholder="Filter status effects..."
        value={filter}
        onChange={(filter) => setFilter(filter)}
      />
      <div className="character-editor-condition-icons">
        {conditionNames
          .filter((name) => name.toLowerCase().includes(filter.toLowerCase()))
          .map((name) => {
            const icon = conditionIcons[name];

            const iconProps = {
              title: name,
              alt: name,
              onClick: () =>
                setConditions((oldConditions) =>
                  oldConditions.includes(name)
                    ? oldConditions.filter((each) => each !== name)
                    : [...oldConditions, name]
                ),
            };

            return (
              <div
                key={name}
                className={clsx("character-editor-condition-icon", {
                  selected: conditions.includes(name),
                })}
              >
                {typeof icon === "string" ? (
                  <img src={icon} {...iconProps} />
                ) : (
                  <div
                    style={{
                      height: 32,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <FontAwesomeIcon
                      icon={icon}
                      color="black"
                      fixedWidth
                      style={{
                        stroke: "white",
                        strokeWidth: 24,
                      }}
                      {...iconProps}
                    />
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </>
  );
}
