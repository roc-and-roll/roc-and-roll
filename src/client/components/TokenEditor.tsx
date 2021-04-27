import React, { useRef, useState, useEffect } from "react";
import { tokenUpdate, tokenRemove } from "../../shared/actions";
import { randomColor } from "../../shared/colors";
import { RRToken } from "../../shared/state";
import { useFileUpload } from "../files";
import { useServerDispatch, useDebouncedServerUpdate } from "../state";
import { Button } from "./ui/Button";
import { Select } from "./ui/Select";

export function TokenEditor({
  token,
  wasJustCreated,
  onClose,
  onNameFirstEdited,
}: {
  token: RRToken;
  onClose: () => void;
  wasJustCreated: boolean;
  onNameFirstEdited: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const [isUploading, upload] = useFileUpload();
  const [scale, setScale] = useState(token.scale.toString());

  const dispatch = useServerDispatch();

  const updateImage = async () => {
    const uploadedFiles = await upload(fileInput.current!.files);
    dispatch(
      tokenUpdate({ id: token.id, changes: { image: uploadedFiles[0]! } })
    );
    fileInput.current!.value = "";
  };

  const [name, setName] = useDebouncedServerUpdate(
    token.name,
    (name) => tokenUpdate({ id: token.id, changes: { name } }),
    1000
  );

  const [_, setProperScale] = useDebouncedServerUpdate(
    token.scale,
    (scale) => tokenUpdate({ id: token.id, changes: { scale } }),
    1000
  );

  useEffect(() => {
    const num = parseInt(scale);
    if (!isNaN(num)) setProperScale(num);
  }, [scale, setProperScale]);

  useEffect(() => {
    fileInput.current!.value = "";
    nameInput.current!.focus();
    if (wasJustCreated) nameInput.current!.select();
  }, [token.id, wasJustCreated]);

  useEffect(() => {
    if (wasJustCreated) onNameFirstEdited();
  }, [name, onNameFirstEdited, wasJustCreated]);

  const remove = () => {
    dispatch(tokenRemove(token.id));
    onClose();
  };

  const [hp, setHP] = useDebouncedServerUpdate(
    token.hp.toString(),
    (hp) => {
      const hpNumber = parseInt(hp);
      if (isNaN(hpNumber)) {
        return;
      }
      return tokenUpdate({ id: token.id, changes: { hp: hpNumber } });
    },
    1000
  );

  const [maxHP, setMaxHP] = useDebouncedServerUpdate(
    token.maxHP.toString(),
    (maxHP) => {
      const maxHPNumber = parseInt(maxHP);
      if (isNaN(maxHPNumber)) {
        return undefined;
      }
      return tokenUpdate({ id: token.id, changes: { maxHP: maxHPNumber } });
    },
    1000
  );

  const [auras, setAuras] = useDebouncedServerUpdate(
    token.auras,
    (auras) => {
      return tokenUpdate({ id: token.id, changes: { auras } });
    },
    1000
  );

  return (
    <div className="token-popup">
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
                <input
                  type="color"
                  value={aura.color}
                  onChange={(e) => {
                    setAuras([
                      ...auras.slice(0, i),
                      { ...aura, color: e.target.value },
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
