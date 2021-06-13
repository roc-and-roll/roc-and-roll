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
} from "../../../shared/state";
import { useFileUpload } from "../../files";
import {
  useServerDispatch,
  useOptimisticDebouncedServerUpdate,
} from "../../state";
import { Button } from "../ui/Button";
import { ColorInput, DebouncedColorInput } from "../ui/ColorInput";
import { Select } from "../ui/Select";
import { DebouncedTextInput } from "../ui/TextInput";
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
} as const;

export function TokenEditor({
  token,
  wasJustCreated,
  onClose,
  onNameFirstEdited,
  isTemplate,
}: {
  token: RRCharacter;
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

  const [scale, setScale] = useOptimisticDebouncedServerUpdate(
    (state) =>
      byId(
        (isTemplate ? state.characterTemplates : state.characters).entities,
        token.id
      )?.scale.toString() ?? "",
    (scaleString) => {
      const scale = parseInt(scaleString);
      if (isNaN(scale)) {
        return;
      }
      return updateFunc({ id: token.id, changes: { scale } });
    },
    1000
  );

  const [hp, setHP] = useOptimisticDebouncedServerUpdate(
    (state) =>
      byId(
        (isTemplate ? state.characterTemplates : state.characters).entities,
        token.id
      )?.hp.toString() ?? "",
    (hpString) => {
      const hp = parseInt(hpString);
      if (isNaN(hp)) {
        return;
      }
      return updateFunc({ id: token.id, changes: { hp } });
    },
    1000
  );

  const [maxHP, setMaxHP] = useOptimisticDebouncedServerUpdate(
    (state) =>
      byId(
        (isTemplate ? state.characterTemplates : state.characters).entities,
        token.id
      )?.maxHP.toString() ?? "",
    (maxHPString) => {
      const maxHP = parseInt(maxHPString);
      if (isNaN(maxHP)) {
        return;
      }
      return updateFunc({ id: token.id, changes: { maxHP } });
    },
    1000
  );

  const [attributes, setAttributes] = useOptimisticDebouncedServerUpdate(
    (state) =>
      byId(
        (isTemplate ? state.characterTemplates : state.characters).entities,
        token.id
      )?.attributes ?? {},
    (attributes) => updateFunc({ id: token.id, changes: { attributes } }),
    1000
  );

  const [auras, setAuras] = useOptimisticDebouncedServerUpdate(
    (state) =>
      byId(
        (isTemplate ? state.characterTemplates : state.characters).entities,
        token.id
      )?.auras ?? [],
    (auras) => updateFunc({ id: token.id, changes: { auras } }),
    1000
  );

  const [conditions, setConditions] = useOptimisticDebouncedServerUpdate(
    (state) =>
      byId(
        (isTemplate ? state.characterTemplates : state.characters).entities,
        token.id
      )?.conditions ?? [],
    (conditions) => updateFunc({ id: token.id, changes: { conditions } }),
    1000
  );

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
          <DebouncedTextInput
            ref={nameInput}
            value={token.name}
            onChange={(name) =>
              dispatch({
                actions: [updateFunc({ id: token.id, changes: { name } })],
                optimisticKey: "name",
              })
            }
            className="token-name"
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
              })
            }
            className="token-name"
          />
        </label>
      </div>
      <div>
        <label>
          HP:{" "}
          <input
            value={hp}
            type="number"
            min={0}
            placeholder="HP"
            onChange={(e) => setHP(e.target.value)}
          />
        </label>
        <div>
          <small>
            you can also edit hp by clicking on the hp in the healthbar of your
            token on the map
          </small>
        </div>
      </div>
      <div>
        <label>
          max HP:{" "}
          <input
            value={maxHP}
            type="number"
            min={1}
            placeholder="max HP"
            onChange={(e) => setMaxHP(e.target.value)}
          />
        </label>
      </div>
      <div className="character-editor-attributes">
        {linkedModifierNames.map((modifier) => (
          <AttributeEditor
            initValue={attributes[modifier] ?? null}
            key={modifier}
            modifier={modifier}
            onChange={(newValue) =>
              setAttributes((oldAttributes) => ({
                ...oldAttributes,
                [modifier]: newValue,
              }))
            }
          />
        ))}
      </div>
      <div>
        <label>
          Size in #squares:{" "}
          <input
            value={scale}
            type="number"
            min={1}
            placeholder="scale"
            onChange={(e) => setScale(e.target.value)}
          />
        </label>
      </div>
      <h3>Auras</h3>
      <ul>
        {auras.map((aura, i) => (
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
                      ...auras.slice(0, i),
                      { ...aura, size: e.target.valueAsNumber },
                      ...auras.slice(i + 1),
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
                      ...auras.slice(0, i),
                      { ...aura, color },
                      ...auras.slice(i + 1),
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
                      ...auras.slice(0, i),
                      { ...aura, shape },
                      ...auras.slice(i + 1),
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
                      ...auras.slice(0, i),
                      {
                        ...aura,
                        visibility,
                      },
                      ...auras.slice(i + 1),
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
                      ...auras.slice(0, i),
                      {
                        ...aura,
                        visibileWhen,
                      },
                      ...auras.slice(i + 1),
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
              onClick={() => {
                setAuras([...auras.slice(0, i), ...auras.slice(i + 1)]);
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
      <ConditionPicker conditions={conditions} setConditions={setConditions} />
      <hr />
      <div>
        <label>
          Token border color:{" "}
          <DebouncedColorInput
            value={token.tokenBorderColor}
            onChange={(tokenBorderColor) =>
              dispatch({
                actions: [
                  updateFunc({ id: token.id, changes: { tokenBorderColor } }),
                ],
                optimisticKey: "tokenBorderColor",
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
      <Button onClick={remove}>delete character</Button>
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
      <input
        type="search"
        placeholder="filter..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="character-editor-condition-icons">
        {conditionNames
          .filter((name) => name.toLowerCase().includes(filter.toLowerCase()))
          .map((name) => (
            <div
              key={name}
              className={clsx("character-editor-condition-icon", {
                selected: conditions.includes(name),
              })}
            >
              <img
                title={name}
                src={conditionIcons[name]}
                alt={name}
                onClick={() =>
                  setConditions((oldConditions) =>
                    oldConditions.includes(name)
                      ? oldConditions.filter((each) => each !== name)
                      : [...oldConditions, name]
                  )
                }
              />
            </div>
          ))}
      </div>
    </>
  );
}

function AttributeEditor({
  modifier,
  onChange,
  initValue,
}: {
  modifier: string;
  onChange: (newValue: number | null) => void;
  initValue: number | null;
}) {
  const [value, setValue] = useState(
    initValue === null ? "" : initValue.toString()
  );

  const handleChange = (val: string) => {
    setValue(val);

    const num = parseInt(val);
    if (!isNaN(num)) {
      onChange(num);
    } else {
      onChange(null);
    }
  };

  return (
    <div className="character-editor-attribute">
      <label>
        <div className="character-editor-attribute-label">{modifier}</div>
        <input
          value={value}
          type="number"
          placeholder="Mod ..."
          onChange={(e) => handleChange(e.target.value)}
        />
      </label>
    </div>
  );
}
