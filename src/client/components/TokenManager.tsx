import React, { useEffect, useRef, useState } from "react";
import {
  playerUpdateAddTokenId,
  tokenAdd,
  tokenRemove,
  tokenUpdate,
} from "../../shared/actions";
import { entries, RRAura, RRToken, RRTokenID } from "../../shared/state";
import { generateRandomToken, tokenImageUrl, useFileUpload } from "../files";
import {
  useDebouncedServerUpdate,
  useServerDispatch,
  useServerState,
} from "../state";
import { useDrag } from "react-dnd";
import { useMyself } from "../myself";
import { GMArea } from "./GMArea";
import { Popover } from "./Popover";
import { GRID_SIZE } from "../../shared/constants";
import { Button } from "./ui/Button";
import { clamp, randomName } from "../../shared/util";
import { randomColor } from "../../shared/colors";

async function makeNewToken(): Promise<Parameters<typeof tokenAdd>[0]> {
  return {
    auras: [],
    conditions: [],
    hp: 0,
    maxHP: 0,
    scale: 1,
    visibility: "everyone",
    isTemplate: false,
    name: await randomName(),
    image: await generateRandomToken(),
  };
}

export function TokenManager() {
  const myself = useMyself();
  const tokens = useServerState((s) => s.tokens);
  const [selectedToken, setSelectedToken] = useState<RRTokenID | null>(null);
  const [newTokenIds, setNewTokenIds] = useState<RRTokenID[]>([]);

  const dispatch = useServerDispatch();

  const [isAddingToken, setIsAddingToken] = useState(false);

  const addToken = () => {
    setIsAddingToken(true);
    (async () => {
      const newToken = dispatch(tokenAdd(await makeNewToken())).payload;
      dispatch(
        playerUpdateAddTokenId({
          id: myself.id,
          tokenId: newToken.id,
        })
      );
      setNewTokenIds((l) => [...l, newToken.id]);
      setSelectedToken(newToken.id);
    })().finally(() => setIsAddingToken(false));
  };

  const tokenPreview = (t: RRToken) => (
    <EditableTokenPreview
      token={t}
      key={t.id}
      wasJustCreated={newTokenIds.includes(t.id)}
      onNameFirstEdited={() =>
        setNewTokenIds((l) => l.filter((id) => id !== t.id))
      }
      isSelected={selectedToken === t.id}
      setSelectedToken={(t) => setSelectedToken(t?.id ?? null)}
    />
  );

  return (
    <>
      <Button onClick={addToken} disabled={isAddingToken}>
        Add Token
      </Button>

      <div className="token-list">
        {entries(tokens)
          .filter((t) => myself.tokenIds.includes(t.id))
          .map(tokenPreview)}
      </div>
      {myself.isGM && (
        <GMArea>
          <h4>Tokens of other players</h4>
          <div className="token-list">
            {entries(tokens)
              .filter((t) => !myself.tokenIds.includes(t.id))
              .map(tokenPreview)}
          </div>
        </GMArea>
      )}
    </>
  );
}

function EditableTokenPreview({
  token,
  isSelected,
  setSelectedToken,
  onNameFirstEdited,
  wasJustCreated,
}: {
  token: RRToken;
  isSelected: boolean;
  setSelectedToken: (t: RRToken | null) => void;
  onNameFirstEdited: () => void;
  wasJustCreated: boolean;
}) {
  const [, dragRef] = useDrag<RRToken, void, null>(() => ({
    type: "token",
    item: token,
  }));

  return (
    <Popover
      content={
        <TokenEditor
          token={token}
          wasJustCreated={wasJustCreated}
          onNameFirstEdited={onNameFirstEdited}
          onClose={() => setSelectedToken(null)}
        />
      }
      visible={!!isSelected}
      onClickOutside={() => setSelectedToken(null)}
      interactive
      placement="right"
    >
      <div
        ref={dragRef}
        className="token-preview"
        onClick={() => setSelectedToken(token)}
      >
        <p>{token.name}</p>
        <TokenPreview token={token} />
      </div>
    </Popover>
  );
}

export function TokenPreview({ token }: { token: RRToken }) {
  return (
    <div
      className="token-image"
      title={token.name}
      style={{
        backgroundImage: token.image
          ? `url(${tokenImageUrl(token.image, GRID_SIZE)})`
          : "none",
      }}
    />
  );
}

export function TokenStack({ tokens }: { tokens: RRToken[] }) {
  const [topIdx, setTopIdx] = useState(0);

  // Allow to click through all tokens
  const sortedTokens = [...tokens.slice(topIdx), ...tokens.slice(0, topIdx)];
  useEffect(() => {
    setTopIdx((old) => clamp(0, old, tokens.length - 1));
  }, [tokens.length]);

  return (
    <div
      className="token-stack"
      onClick={() =>
        setTopIdx((old) => (old === 0 ? tokens.length - 1 : old - 1))
      }
    >
      {sortedTokens.map((token, i) => (
        <div
          key={token.id}
          style={{
            left:
              tokens.length === 1
                ? 24 / 2 // center token if there is just one in the stack
                : i === 0
                ? 0 // avoid division by 0
                : i * (24 / (tokens.length - 1)),
          }}
        >
          <TokenPreview token={token} />
        </div>
      ))}
    </div>
  );
}

function TokenEditor({
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
                <select
                  value={aura.shape}
                  onChange={(e) => {
                    setAuras([
                      ...auras.slice(0, i),
                      { ...aura, shape: e.target.value as RRAura["shape"] },
                      ...auras.slice(i + 1),
                    ]);
                  }}
                >
                  <option value="circle">circle</option>
                  <option value="square">square</option>
                </select>
              </label>
            </div>
            <div>
              <label>
                Visible to{" "}
                <select
                  value={aura.visibility}
                  onChange={(e) => {
                    setAuras([
                      ...auras.slice(0, i),
                      {
                        ...aura,
                        visibility: e.target.value as RRAura["visibility"],
                      },
                      ...auras.slice(i + 1),
                    ]);
                  }}
                >
                  <option value="everyone">everyone</option>
                  <option value="playerAndGM">playerAndGM</option>
                  <option value="playerOnly">myself</option>
                </select>
              </label>
            </div>
            {/*
            <div>
              <label>
                Visible when{" "}
                <select
                  value={aura.visibileWhen}
                  onChange={(e) => {
                    setAuras([
                      ...auras.slice(0, i),
                      {
                        ...aura,
                        visibileWhen: e.target.value as RRAura["visibileWhen"],
                      },
                      ...auras.slice(i + 1),
                    ]);
                  }}
                >
                  <option value="always">always</option>
                  <option value="onTurn">on my turn</option>
                  <option value="hover">on hover</option>
                </select>
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
