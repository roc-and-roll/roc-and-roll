import React, { useEffect, useRef, useState } from "react";
import { tokenAdd, tokenUpdate } from "../../shared/actions";
import { EntityCollection, RRID, RRToken } from "../../shared/state";
import { fileUrl, useFileUpload } from "../files";
import { useServerDispatch, useServerState } from "../state";
import { useDrag } from "react-dnd";

const mapEntities = <E extends { id: RRID }, J>(
  map: EntityCollection<E>,
  cb: (e: E) => J
) => {
  return map.ids.map((id) => cb(map.entities[id]!));
};

export function TokenManager() {
  const tokens = useServerState((s) => s.tokens);
  const [selectedToken, setSelectedToken] = useState<RRToken | null>(null);

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
    name: "unnamed",
  });

  const addToken = () => {
    setSelectedToken(dispatch(tokenAdd(defaultToken())).payload);
  };

  return (
    <div className="token-manager">
      <button onClick={addToken}>Add Token</button>
      {selectedToken && (
        <TokenEditor
          token={selectedToken}
          onClose={() => setSelectedToken(null)}
        />
      )}
      <div className="token-list">
        {mapEntities(tokens, (t) => (
          <TokenPreview
            token={t}
            key={t.id}
            onSelect={() => setSelectedToken(t)}
          />
        ))}
      </div>
    </div>
  );
}

function TokenPreview({
  token,
  onSelect,
}: {
  token: RRToken;
  onSelect: () => void;
}) {
  const [, dragRef] = useDrag<RRToken, void, null>(() => ({
    type: "token",
    item: token,
  }));

  return (
    <div onClick={onSelect} ref={dragRef} className="token-preview">
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
  );
}

function TokenEditor({
  token,
  onClose,
}: {
  token: RRToken;
  onClose: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const [isUploading, upload] = useFileUpload("upload-token");
  const [name, setName] = useState(token.name);

  const dispatch = useServerDispatch();

  useEffect(() => {
    setName(token.name);
    fileInput.current!.value = "";
    nameInput.current!.focus();
  }, [token]);

  useEffect(() => {
    if (name == "unnamed") nameInput.current!.select();
  }, [name]);

  const updateImage = async () => {
    const uploadedFiles = await upload(fileInput.current!.files);
    dispatch(
      tokenUpdate({ id: token.id, changes: { image: uploadedFiles[0]! } })
    );
    fileInput.current!.value = "";
  };

  const updateName = () => {
    dispatch(tokenUpdate({ id: token.id, changes: { name } }));
  };

  return (
    <div className="token-popup">
      <div className="token-popup-close" onClick={onClose}>
        ×
      </div>
      <input
        ref={nameInput}
        onKeyPress={(e) => e.key === "Enter" && updateName()}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="token-name"
      />

      <input
        disabled={isUploading}
        onChange={updateImage}
        type="file"
        ref={fileInput}
      />
    </div>
  );
}
