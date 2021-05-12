import React, { useRef, useEffect } from "react";
import {
  characterUpdate,
  characterRemove,
  characterTemplateUpdate,
  characterTemplateRemove,
} from "../../../shared/actions";
import { randomColor } from "../../../shared/colors";
import { RRCharacter } from "../../../shared/state";
import { useFileUpload } from "../../files";
import {
  useServerDispatch,
  useOptimisticDebouncedServerUpdate,
} from "../../state";
import { Button } from "../ui/Button";
import { ColorInput } from "../ui/ColorInput";
import { Select } from "../ui/Select";

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
      updateFunc({ id: token.id, changes: { image: uploadedFiles[0]! } })
    );
    fileInput.current!.value = "";
  };

  const [name, setName] = useOptimisticDebouncedServerUpdate(
    token.name,
    (name) => updateFunc({ id: token.id, changes: { name } }),
    1000
  );

  const [scale, setScale] = useOptimisticDebouncedServerUpdate(
    token.scale.toString(),
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
    token.hp.toString(),
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
    token.maxHP.toString(),
    (maxHPString) => {
      const maxHP = parseInt(maxHPString);
      if (isNaN(maxHP)) {
        return;
      }
      return updateFunc({ id: token.id, changes: { maxHP } });
    },
    1000
  );

  const [
    initiativeModifier,
    setInitiativeModifier,
  ] = useOptimisticDebouncedServerUpdate(
    token.initiativeModifier?.toString(),
    (initiativeModifierString) => {
      if (!initiativeModifierString || initiativeModifierString.length === 0) {
        return updateFunc({
          id: token.id,
          changes: { initiativeModifier: null },
        });
      }
      const initiativeModifier = parseInt(initiativeModifierString);
      if (isNaN(initiativeModifier)) {
        return;
      }
      return updateFunc({ id: token.id, changes: { initiativeModifier } });
    },
    1000
  );

  const [auras, setAuras] = useOptimisticDebouncedServerUpdate(
    token.auras,
    (auras) => updateFunc({ id: token.id, changes: { auras } }),
    1000
  );

  useEffect(() => {
    fileInput.current!.value = "";
    nameInput.current!.focus();
    if (wasJustCreated) nameInput.current!.select();
  }, [token.id, wasJustCreated]);

  useEffect(() => {
    if (wasJustCreated) onNameFirstEdited();
  }, [name, onNameFirstEdited, wasJustCreated]);

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
          <input
            ref={nameInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
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
      <div>
        <label>
          Initiative Modifier:{" "}
          <input
            value={initiativeModifier}
            type="number"
            placeholder="Mod ..."
            onChange={(e) => setInitiativeModifier(e.target.value)}
          />
        </label>
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
            <button
              onClick={() => {
                setAuras([...auras.slice(0, i), ...auras.slice(i + 1)]);
              }}
            >
              delete aura
            </button>
          </li>
        ))}
        <li>
          <button
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
          </button>
        </li>
      </ul>
      <hr />
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
      <Button onClick={remove}>delete token</Button>
    </div>
  );
}
