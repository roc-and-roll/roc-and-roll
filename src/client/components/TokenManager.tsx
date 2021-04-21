import React, { useEffect, useRef, useState } from "react";
import {
  playerUpdate,
  tokenAdd,
  tokenRemove,
  tokenUpdate,
} from "../../shared/actions";
import { RRToken, RRTokenID } from "../../shared/state";
import { fileUrl, useFileUpload } from "../files";
import {
  entries,
  useDebouncedServerUpdate,
  useServerDispatch,
  useServerState,
} from "../state";
import { useDrag } from "react-dnd";
import { useMyself } from "../myself";
import { GMArea } from "./GMArea";
import { Popover } from "./Popover";
import { randomName } from "../../shared/namegen";

export function TokenManager() {
  const myself = useMyself();
  const tokens = useServerState((s) => s.tokens);
  const [selectedToken, setSelectedToken] = useState<RRTokenID | null>(null);
  const [newTokenIds, setNewTokenIds] = useState<RRTokenID[]>([]);

  const dispatch = useServerDispatch();

  const defaultToken = (): Omit<RRToken, "id"> => ({
    auras: [],
    conditions: [],
    hp: 0,
    image: null,
    maxHP: 0,
    size: 1,
    visibility: "everyone",
    isTemplate: false,
    name: randomName(),
  });

  const addToken = () => {
    const newToken = dispatch(tokenAdd(defaultToken())).payload;
    dispatch(
      playerUpdate({
        id: myself.id,
        changes: {
          tokenIds: [...myself.tokenIds, newToken.id],
        },
      })
    );
    setNewTokenIds((l) => [...l, newToken.id]);
    setSelectedToken(newToken.id);
  };

  const tokenPreview = (t: RRToken) => (
    <TokenPreview
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
      <button onClick={addToken}>Add Token</button>

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

function TokenPreview({
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
        {token.name}
        <div
          className="token-image"
          style={{
            backgroundImage: token.image
              ? `url(${fileUrl(token.image)})`
              : "none",
          }}
        />
      </div>
    </Popover>
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
  const [isUploading, upload] = useFileUpload("upload-token");
  const [size, setSize] = useState(token.size);

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

  const updateSize = () => {
    dispatch(tokenUpdate({ id: token.id, changes: { size } }));
  };

  return (
    <div className="token-popup">
      <button className="popover-close" onClick={onClose}>
        ×
      </button>
      <input
        ref={nameInput}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="token-name"
      />
      <input
        value={size}
        type="number"
        min={1}
        placeholder="size"
        onChange={(e) => setSize(e.target.valueAsNumber)}
        onKeyPress={(e) => e.key === "Enter" && updateSize()}
      />

      <input
        disabled={isUploading}
        onChange={updateImage}
        type="file"
        ref={fileInput}
      />
      <button onClick={remove}>Delete</button>
    </div>
  );
}
