import React, { useRef, useEffect, useState } from "react";
import {
  characterUpdate,
  characterRemove,
  characterTemplateUpdate,
  characterTemplateRemove,
} from "../../../shared/actions";
import { randomColor } from "../../../shared/colors";
import {
  byId,
  conditionNames,
  linkedModifierNames,
  RRCharacter,
  RRCharacterCondition,
  RRCharacterTemplate,
} from "../../../shared/state";
import { useFileUpload } from "../../files";
import { useServerDispatch } from "../../state";
import { Button } from "../ui/Button";
import { ColorInput, SmartColorInput } from "../ui/ColorInput";
import { Select } from "../ui/Select";
import { SmartIntegerInput, SmartTextInput, TextInput } from "../ui/TextInput";
import clsx from "clsx";
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
import halfCover from "../../../third-party/icons/conditions/half-cover.png";
import hidden from "../../../third-party/icons/conditions/hidden.png";
import raging from "../../../third-party/icons/conditions/raging.png";
import surprised from "../../../third-party/icons/conditions/surprised.png";
import totalCover from "../../../third-party/icons/conditions/total-cover.png";
import threeQuarterCovers from "../../../third-party/icons/conditions/three-quarters-cover.png";
import speedometer from "../../../third-party/game-icons.net/ffffff/transparent/1x1/delapouite/speedometer.svg";
import tortoise from "../../../third-party/game-icons.net/ffffff/transparent/1x1/delapouite/tortoise.svg";
import snail from "../../../third-party/game-icons.net/ffffff/transparent/1x1/lorc/snail.svg";
import voodooDoll from "../../../third-party/game-icons.net/ffffff/transparent/1x1/lorc/voodoo-doll.svg";
import bullseye from "../../../third-party/game-icons.net/ffffff/transparent/1x1/skoll/bullseye.svg";
import { DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME } from "../../../shared/constants";
import { faSkullCrossbones } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export interface ConditionWithIcon {
  name: RRCharacterCondition;
  icon: string;
}

export const conditionIcons = {
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
  "half-cover": halfCover,
  hidden: hidden,
  raging: raging,
  surprised: surprised,
  "total-cover": totalCover,
  "three-quarters-cover": threeQuarterCovers,
  hasted: speedometer,
  cursed: voodooDoll,
  "hunters mark": bullseye,
  polymorphed: snail,
  slowed: tortoise,
  dead: faSkullCrossbones,
} as const;

export function TokenEditor({
  token,
  wasJustCreated,
  onClose,
  onNameFirstEdited,
  isTemplate,
}: {
  token: RRCharacter | RRCharacterTemplate;
  onClose: () => void;
  wasJustCreated: boolean;
  onNameFirstEdited: () => void;
  isTemplate?: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const [isUploading, upload] = useFileUpload();

  const dispatch = useServerDispatch();
  const updateFunc = isTemplate ? characterTemplateUpdate : characterUpdate;
  const removeFunc = isTemplate ? characterTemplateRemove : characterRemove;

  const updateImage = async () => {
    const uploadedFiles = await upload(fileInput.current!.files);
    dispatch(
      updateFunc({ id: token.id, changes: { tokenImage: uploadedFiles[0]! } })
    );
    fileInput.current!.value = "";
  };

  const setAuras = (updater: React.SetStateAction<RRCharacter["auras"]>) =>
    dispatch((state) => {
      const oldAuras = byId(
        state[isTemplate ? "characterTemplates" : "characters"].entities,
        token.id
      )?.auras;

      if (oldAuras === undefined) {
        return [];
      }
      const newAuras =
        typeof updater === "function" ? updater(oldAuras) : updater;

      return {
        actions: [updateFunc({ id: token.id, changes: { auras: newAuras } })],
        optimisticKey: "auras",
        syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
      };
    });

  const setConditions = (
    updater: React.SetStateAction<RRCharacter["conditions"]>
  ) =>
    dispatch((state) => {
      const oldConditions = byId(
        state[isTemplate ? "characterTemplates" : "characters"].entities,
        token.id
      )?.conditions;

      if (oldConditions === undefined) {
        return [];
      }

      const newConditions =
        typeof updater === "function" ? updater(oldConditions) : updater;

      return {
        actions: [
          updateFunc({ id: token.id, changes: { conditions: newConditions } }),
        ],
        optimisticKey: "conditions",
        syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
      };
    });

  useEffect(() => {
    fileInput.current!.value = "";
    nameInput.current!.focus();
    if (wasJustCreated) nameInput.current!.select();
  }, [token.id, wasJustCreated]);

  useEffect(() => {
    if (wasJustCreated) onNameFirstEdited();
  }, [token.name, onNameFirstEdited, wasJustCreated]);

  const remove = () => {
    dispatch(removeFunc(token.id));
    onClose();
  };

  return (
    <div className="token-popup" onMouseDown={(e) => e.stopPropagation()}>
      <Button className="popover-close" onClick={onClose}>
        ×
      </Button>
      <div>
        <label>
          Name:{" "}
          <SmartTextInput
            ref={nameInput}
            value={token.name}
            onChange={(name) =>
              dispatch({
                actions: [updateFunc({ id: token.id, changes: { name } })],
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
            checked={token.visibility === "gmOnly"}
            onChange={(e) =>
              dispatch({
                actions: [
                  updateFunc({
                    id: token.id,
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
      <HPEditor character={token} updateFunc={updateFunc} />
      <div className="character-editor-attributes">
        {linkedModifierNames.map((modifier) => (
          <AttributeEditor
            key={modifier}
            value={token.attributes[modifier] ?? 0}
            label={modifier}
            onChange={(newValue) =>
              dispatch((state) => {
                const oldAttributes = byId(
                  (isTemplate ? state.characterTemplates : state.characters)
                    .entities,
                  token.id
                )?.attributes;

                if (!oldAttributes) {
                  return [];
                }

                return {
                  actions: [
                    updateFunc({
                      id: token.id,
                      changes: {
                        attributes: {
                          ...oldAttributes,
                          [modifier]: newValue,
                        },
                      },
                    }),
                  ],
                  optimisticKey: "attributes",
                  syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
                };
              })
            }
          />
        ))}
      </div>
      <div>
        <label>
          Size in #squares:{" "}
          <SmartIntegerInput
            value={token.scale}
            min={1}
            placeholder="scale"
            onChange={(scale) =>
              dispatch({
                actions: [updateFunc({ id: token.id, changes: { scale } })],
                optimisticKey: "scale",
                syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
              })
            }
          />
        </label>
      </div>
      <h3>Auras</h3>
      <ul>
        {token.auras.map((aura, i) => (
          <li key={i}>
            <div>
              <label>
                Size in feet{" "}
                <input
                  type="number"
                  min={0}
                  value={aura.size}
                  onChange={(e) => {
                    setAuras([
                      ...token.auras.slice(0, i),
                      { ...aura, size: e.target.valueAsNumber },
                      ...token.auras.slice(i + 1),
                    ]);
                  }}
                />
              </label>
            </div>
            <div>
              <label>
                Color{" "}
                <ColorInput
                  value={aura.color}
                  onChange={(color) => {
                    setAuras([
                      ...token.auras.slice(0, i),
                      { ...aura, color },
                      ...token.auras.slice(i + 1),
                    ]);
                  }}
                />
              </label>
            </div>
            <div>
              <label>
                Shape{" "}
                <Select
                  value={aura.shape}
                  onChange={(shape) => {
                    setAuras([
                      ...token.auras.slice(0, i),
                      { ...aura, shape },
                      ...token.auras.slice(i + 1),
                    ]);
                  }}
                  options={[
                    { value: "circle", label: "circle" },
                    { value: "square", label: "square" },
                  ]}
                />
              </label>
            </div>
            <div>
              <label>
                Visible to{" "}
                <Select
                  value={aura.visibility}
                  options={[
                    { value: "everyone", label: "everyone" },
                    { value: "playerAndGM", label: "playerAndGM" },
                    { value: "playerOnly", label: "myself" },
                  ]}
                  onChange={(visibility) => {
                    setAuras([
                      ...token.auras.slice(0, i),
                      {
                        ...aura,
                        visibility,
                      },
                      ...token.auras.slice(i + 1),
                    ]);
                  }}
                />
              </label>
            </div>
            {/*
            <div>
              <label>
                Visible when{" "}
                <Select
                  value={aura.visibileWhen}
                  onChange={(visibileWhen) => {
                    setAuras([
                      ...token.auras.slice(0, i),
                      {
                        ...aura,
                        visibileWhen,
                      },
                      ...token.auras.slice(i + 1),
                    ]);
                  }}
                  options={[
                    { value: "always", label: "always" },
                    { value: "onTurn", label: "on my turn" },
                    { value: "hover", label: "on hover" },
                  ]}
                />
              </label>
            </div>
            */}
            <Button
              className="red"
              onClick={() => {
                setAuras([
                  ...token.auras.slice(0, i),
                  ...token.auras.slice(i + 1),
                ]);
              }}
            >
              delete aura
            </Button>
          </li>
        ))}
        <li>
          <Button
            onClick={() => {
              setAuras((old) => [
                ...old,
                {
                  color: randomColor(),
                  shape: "circle",
                  size: 10,
                  visibileWhen: "always",
                  visibility: "everyone",
                },
              ]);
            }}
          >
            add aura
          </Button>
        </li>
      </ul>
      <ConditionPicker
        conditions={token.conditions}
        setConditions={setConditions}
      />
      <hr />
      <div>
        <label>
          Token border color:{" "}
          <SmartColorInput
            value={token.tokenBorderColor}
            onChange={(tokenBorderColor) =>
              dispatch({
                actions: [
                  updateFunc({ id: token.id, changes: { tokenBorderColor } }),
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
          <input
            disabled={isUploading}
            onChange={updateImage}
            type="file"
            ref={fileInput}
          />
        </label>
      </div>
      <hr />
      <Button className="red" onClick={remove}>
        delete character {isTemplate && "template"}
      </Button>
    </div>
  );
}

function HPEditor({
  character: token,
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
            value={token.hp}
            min={0}
            placeholder="HP"
            onChange={(hp) =>
              dispatch({
                actions: [updateFunc({ id: token.id, changes: { hp } })],
                optimisticKey: "hp",
                syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
              })
            }
          />
        </label>
        <label>
          Max HP
          <SmartIntegerInput
            value={token.maxHP}
            min={0}
            placeholder="Max HP"
            onChange={(maxHP) =>
              dispatch({
                actions: [updateFunc({ id: token.id, changes: { maxHP } })],
                optimisticKey: "maxHP",
                syncToServerThrottle: DEFAULT_SYNC_TO_SERVER_DEBOUNCE_TIME,
              })
            }
          />
        </label>
        <label>
          Temp HP
          <SmartIntegerInput
            value={token.temporaryHP}
            min={0}
            placeholder="Temp HP"
            onChange={(temporaryHP) =>
              dispatch({
                actions: [
                  updateFunc({ id: token.id, changes: { temporaryHP } }),
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
            value={token.maxHPAdjustment}
            placeholder="max HP adjustment"
            onChange={(maxHPAdjustment) =>
              dispatch({
                actions: [
                  updateFunc({ id: token.id, changes: { maxHPAdjustment } }),
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
      <h3>Status</h3>
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

function AttributeEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (newValue: number | null) => void;
}) {
  return (
    <div className="character-editor-attribute">
      <label>
        <div className="character-editor-attribute-label">{label}</div>
        <SmartIntegerInput
          value={value}
          placeholder="Mod ..."
          onChange={(value) => onChange(value)}
        />
      </label>
    </div>
  );
}
